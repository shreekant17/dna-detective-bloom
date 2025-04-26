import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Scan, Check, AlertCircle, Camera, CameraOff, RefreshCw, QrCode, Barcode, FlipHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { validateDNASequence } from '@/utils/dnaUtils';
import {
  extractDNAFromBarcode,
  isValidBarcode,
  createBarcodeReader,
  processBarcodeResult,
  getOptimalCameraConstraints,
  checkBrowserCompatibility
} from '@/utils/barcodeUtils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import QrScanner from 'react-qr-scanner';

interface BarcodeScannerProps {
  onSequenceFound: (sequence: string) => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onSequenceFound }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scanning, setScanning] = useState(false);
  const [hasCamera, setHasCamera] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cameraInitialized, setCameraInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const readerRef = useRef<any>(null);
  const isMobile = useIsMobile();
  const streamRef = useRef<MediaStream | null>(null);
  const decodeIntervalRef = useRef<number | null>(null);
  const [cameraPermissionState, setCameraPermissionState] = useState<PermissionState | null>(null);
  const initScannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [scanMode, setScanMode] = useState<'qr' | 'barcode'>('qr');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);

  // Function to release camera resources
  const releaseCamera = async () => {
    console.log("Releasing camera resources...");

    // Clear scanning interval
    if (decodeIntervalRef.current) {
      window.clearInterval(decodeIntervalRef.current);
      decodeIntervalRef.current = null;
    }

    // Clear init timer
    if (initScannerTimerRef.current) {
      clearTimeout(initScannerTimerRef.current);
      initScannerTimerRef.current = null;
    }

    // Stop any active stream from streamRef first
    if (streamRef.current) {
      const tracks = streamRef.current.getTracks();
      tracks.forEach(track => {
        console.log(`Stopping track: ${track.kind} (${track.label || 'unnamed'})`);
        track.stop();
      });
      streamRef.current = null;
    }

    // Also stop any stream attached to the video element
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => {
        console.log(`Stopping video track: ${track.kind} (${track.label || 'unnamed'})`);
        track.stop();
      });
      videoRef.current.srcObject = null;
    }

    setScanning(false);
    setCameraInitialized(false);
  };

  // Check browser compatibility and camera permissions
  const checkDeviceSupport = useCallback(async () => {
    if (cameraInitialized) {
      console.log("Camera already initialized, skipping device support check");
      return true;
    }

    console.log("Starting device support check...");
    const compatibility = checkBrowserCompatibility();

    if (!compatibility.isCompatible) {
      console.warn("Browser compatibility issues:", compatibility.issues);
      setHasCamera(false);
      setErrorMessage(`Browser issues: ${compatibility.issues.join(', ')}`);
      return false;
    }

    try {
      // Check if the browser supports the Permissions API
      if ('permissions' in navigator) {
        const permissionStatus = await navigator.permissions.query({ name: 'camera' as PermissionName });
        console.log(`Camera permission status: ${permissionStatus.state}`);
        setCameraPermissionState(permissionStatus.state);

        // Listen for permission changes
        permissionStatus.onchange = () => {
          console.log(`Camera permission changed to: ${permissionStatus.state}`);
          setCameraPermissionState(permissionStatus.state);
        };

        if (permissionStatus.state === 'denied') {
          setHasCamera(false);
          setErrorMessage("Camera access denied. Please check your browser settings.");
          return false;
        }
      }

      // Check for available cameras
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');

      console.log(`Found ${videoDevices.length} video input devices`);
      setAvailableCameras(videoDevices);

      if (videoDevices.length === 0) {
        setHasCamera(false);
        setErrorMessage("No camera detected on this device");
        return false;
      }

      // On mobile, log all available devices to help debugging
      if (isMobile) {
        console.log("Available video devices:", videoDevices.map(d =>
          `${d.kind}: ${d.label || 'unnamed'} (${d.deviceId.substring(0, 8)}...)`
        ));
      }

      return true;
    } catch (error) {
      console.error("Error checking camera:", error);
      setHasCamera(false);
      setErrorMessage(`Error accessing camera: ${(error as Error).message || "Unknown error"}`);
      return false;
    }
  }, [isMobile, cameraInitialized]);

  // Manual frame capture and processing for better performance
  const captureAndDecode = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !streamRef.current) {
      console.log("Missing required refs for scanning:", {
        video: !!videoRef.current,
        canvas: !!canvasRef.current,
        stream: !!streamRef.current
      });
      return;
    }

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (!context) {
        console.error("Could not get canvas context");
        return;
      }

      // Check if video is ready
      if (video.readyState !== 4) {
        console.log(`Video not ready, state: ${video.readyState}`);
        return;
      }

      // Check if video dimensions are valid
      if (video.videoWidth <= 0 || video.videoHeight <= 0) {
        console.log(`Invalid video dimensions: ${video.videoWidth}x${video.videoHeight}`);
        return;
      }

      // Only log dimensions occasionally to reduce console noise
      if (Math.random() < 0.05) { // Log roughly 5% of the time
        console.log(`Processing frame: ${video.videoWidth}x${video.videoHeight}, scan mode: ${scanMode}`);
      }

      // Set canvas dimensions to match video
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      // Draw the current frame to canvas
      context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);

      // Get image data from canvas
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

      // Use different decoding methods based on scan mode
      if (scanMode === 'qr') {
        // QR code scanning is now handled by react-qr-scanner
        // This function is only used for barcode scanning
        return;
      } else {
        // Use ZXing for traditional barcodes
        if (!readerRef.current) {
          console.error("Barcode reader not initialized");
          // Try to reinitialize the reader if it's missing
          try {
            console.log("Attempting to reinitialize barcode reader");
            readerRef.current = createBarcodeReader(scanMode);
            if (!readerRef.current) {
              console.error("Failed to reinitialize barcode reader");
              return;
            }
          } catch (error) {
            console.error("Error reinitializing barcode reader:", error);
            return;
          }
        }

        try {
          // Try to decode from the video element directly
          const result = readerRef.current.decode(video);

          if (result && typeof result.getText === 'function') {
            const text = result.getText();
            console.log("Barcode detected:", text);
            handleBarcodeDetected(result);
          }
        } catch (error) {
          // Most errors will be "not found" which is expected
          if ((error as Error).name !== 'NotFoundException') {
            // Only log non-NotFoundException errors occasionally to reduce console noise
            if (Math.random() < 0.1) { // Log roughly 10% of the time
              console.error("Barcode decoding error:", error);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error in capture and decode cycle:", error);
    }
  }, [scanMode]);

  const startScanning = async () => {
    console.log("Starting camera initialization process...");
    setErrorMessage(null);
    setIsInitializing(true);
    setScanResult(null);

    try {
      // First check if device has camera support
      console.log("Checking device support...");
      const hasSupport = await checkDeviceSupport();
      if (!hasSupport) {
        console.log("Device support check failed");
        setIsInitializing(false);
        return;
      }
      console.log("Device support check passed");

      console.log(`Starting camera on ${isMobile ? 'mobile' : 'desktop'} device with facing mode: ${facingMode}`);

      // Only release camera if we're already scanning
      if (scanning) {
        console.log("Already scanning, releasing previous camera resources...");
        await releaseCamera();
        console.log("Previous camera resources released");
      }

      // Only create a barcode reader if we're in barcode mode
      if (scanMode === 'barcode') {
        console.log("Creating barcode reader for mode:", scanMode);
        try {
          // Create a new barcode reader with the current scan mode
          readerRef.current = createBarcodeReader(scanMode);

          // Verify the reader was created successfully
          if (!readerRef.current) {
            throw new Error("Failed to create barcode reader");
          }

          console.log("Barcode reader created successfully:", readerRef.current);
        } catch (readerError) {
          console.error("Error creating barcode reader:", readerError);
          setErrorMessage(`Error initializing barcode reader: ${(readerError as Error).message}`);
          setIsInitializing(false);
          return;
        }

        try {
          // Get optimal camera constraints based on device and scan mode
          const constraints = await getOptimalCameraConstraints(isMobile, scanMode) as MediaStreamConstraints;
          console.log("Using camera constraints:", JSON.stringify(constraints));

          // Check if getUserMedia is supported
          if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error("getUserMedia is not supported in this browser");
          }

          // Attempt to get camera stream
          console.log("Requesting camera stream...");
          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          console.log("Camera stream obtained successfully");
          streamRef.current = stream;

          if (!videoRef.current) {
            throw new Error("Video element reference is not available");
          }

          // Set up video element
          console.log("Setting up video element...");
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true'); // Required for iOS
          videoRef.current.setAttribute('autoplay', 'true');
          videoRef.current.setAttribute('muted', 'true');

          // Set up event handlers for the video element
          videoRef.current.onloadedmetadata = () => {
            console.log("Video metadata loaded event fired");
            console.log(`Video dimensions: ${videoRef.current?.videoWidth || 0}×${videoRef.current?.videoHeight || 0}`);

            if (!videoRef.current) {
              console.error("Video element reference lost during metadata loading");
              throw new Error("Video element reference lost during metadata loading");
            }

            // Ensure video dimensions are valid
            if (videoRef.current.videoWidth <= 0 || videoRef.current.videoHeight <= 0) {
              console.error("Invalid video dimensions detected");
              throw new Error("Invalid video dimensions");
            }

            console.log("Attempting to play video...");
            videoRef.current.play()
              .then(() => {
                console.log("Video playback started successfully");
                setCameraInitialized(true);
                setScanning(true);
                setHasCamera(true);
                setIsInitializing(false);

                // Start capturing frames at regular intervals for decoding
                if (decodeIntervalRef.current) {
                  window.clearInterval(decodeIntervalRef.current);
                }

                const interval = 200; // 200ms for barcode scanning (faster than before)
                console.log(`Setting scan interval to ${interval}ms for barcode mode`);
                decodeIntervalRef.current = window.setInterval(captureAndDecode, interval);
              })
              .catch(e => {
                console.error("Error playing video:", e);
                setErrorMessage("Error starting video playback: " + e.message);
                setIsInitializing(false);
                // Don't release camera here, let the user decide to stop scanning
              });
          };

          videoRef.current.onerror = (e: Event) => {
            console.error("Video element error event fired:", e);
            const errorMessage = e instanceof Error ? e.message : "Unknown video error";
            setErrorMessage("Video initialization failed: " + errorMessage);
            setIsInitializing(false);
            // Don't release camera here, let the user decide to stop scanning
          };

          // Add playing event handler
          videoRef.current.onplaying = () => {
            console.log("Video playing event fired");
          };

          // Add waiting event handler
          videoRef.current.onwaiting = () => {
            console.log("Video waiting event fired");
          };

          // Add stalled event handler
          videoRef.current.onstalled = () => {
            console.log("Video stalled event fired");
          };

        } catch (cameraError) {
          console.error("Error accessing camera with constraints:", cameraError);

          // Fallback to basic constraints
          try {
            console.log("Trying fallback camera access method...");
            const stream = await navigator.mediaDevices.getUserMedia({
              video: {
                facingMode: facingMode,
                width: { ideal: 1280 },
                height: { ideal: 720 }
              },
              audio: false
            });
            console.log("Fallback camera stream obtained successfully");
            streamRef.current = stream;

            if (!videoRef.current) {
              throw new Error("Video element reference is not available in fallback");
            }

            // Set up video element for fallback
            console.log("Setting up video element (fallback)...");
            videoRef.current.srcObject = stream;
            videoRef.current.setAttribute('playsinline', 'true');
            videoRef.current.setAttribute('autoplay', 'true');
            videoRef.current.setAttribute('muted', 'true');

            videoRef.current.onloadedmetadata = () => {
              console.log("Video metadata loaded event fired (fallback)");
              if (!videoRef.current) {
                throw new Error("Video element reference lost during fallback metadata loading");
              }

              console.log("Attempting to play video (fallback)...");
              videoRef.current.play()
                .then(() => {
                  console.log("Video playback started successfully (fallback)");
                  setCameraInitialized(true);
                  setScanning(true);
                  setHasCamera(true);
                  setIsInitializing(false);

                  if (decodeIntervalRef.current) {
                    window.clearInterval(decodeIntervalRef.current);
                  }

                  decodeIntervalRef.current = window.setInterval(captureAndDecode, 200);
                })
                .catch(e => {
                  console.error("Error playing video (fallback):", e);
                  setErrorMessage("Error starting video playback (fallback): " + e.message);
                  setIsInitializing(false);
                  // Don't release camera here, let the user decide to stop scanning
                });
            };
          } catch (fallbackError) {
            console.error("All camera access methods failed:", fallbackError);
            setErrorMessage(`Camera access failed: ${(fallbackError as Error).message}`);
            setHasCamera(false);
            setIsInitializing(false);

            toast({
              title: "Camera Error",
              description: "Could not access camera. Please check permissions and try again.",
              variant: "destructive",
            });
          }
        }
      } else {
        // For QR code scanning, we'll use react-qr-scanner
        // Just set the scanning state to true
        setCameraInitialized(true);
        setScanning(true);
        setHasCamera(true);
        setIsInitializing(false);
      }

      // Set timeout to handle case where video never fires onplaying
      initScannerTimerRef.current = setTimeout(() => {
        if (!cameraInitialized && isInitializing) {
          console.log("Camera initialization timed out");
          setErrorMessage("Camera initialization timed out. Please try again.");
          setIsInitializing(false);
          // Don't release camera here, let the user decide to stop scanning
        }
      }, 10000);

    } catch (error) {
      console.error("General camera access error:", error);
      setHasCamera(false);
      setIsInitializing(false);
      setErrorMessage(`Camera error: ${(error as Error).message || "Unknown error"}`);

      toast({
        title: "Camera Error",
        description: "Could not access camera. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const stopScanning = async () => {
    console.log("Stopping scanner...");
    await releaseCamera();
  };

  const handleBarcodeDetected = async (result: any) => {
    const barcodeData = processBarcodeResult(result);
    console.log("Processing barcode:", barcodeData);
    setScanResult(barcodeData);

    if (isValidBarcode(barcodeData, scanMode)) {
      try {
        const dnaSequence = await extractDNAFromBarcode(barcodeData);

        if (dnaSequence && validateDNASequence(dnaSequence)) {
          captureFrame(barcodeData);
          await stopScanning();

          toast({
            title: scanMode === 'qr' ? "QR Code Detected" : "Barcode Detected",
            description: `Found ${scanMode === 'qr' ? 'QR code' : 'barcode'}: ${barcodeData}`,
          });

          onSequenceFound(dnaSequence);
        } else {
          console.log("No valid DNA sequence found in barcode");
          toast({
            title: "Invalid Barcode",
            description: "No DNA sequence associated with this barcode.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error processing barcode:", error);
        toast({
          title: "Error",
          description: "Failed to process barcode. Please try again.",
          variant: "destructive",
        });
      }
    } else {
      console.log("Invalid barcode format detected");
      toast({
        title: "Invalid Barcode Format",
        description: `The scanned ${scanMode === 'qr' ? 'QR code' : 'barcode'} is not in a recognized format.`,
        variant: "destructive",
      });
    }
  };

  const handleQrScan = (data: any) => {
    if (data) {
      console.log("QR code detected:", data);
      // Extract the text content from the result
      const qrText = typeof data === 'string' ? data : data.text || data.data;

      if (qrText) {
        // Create a mock result object with getText method to match the expected format
        const mockResult = {
          getText: () => qrText
        };
        handleBarcodeDetected(mockResult);
      }
    }
  };

  const handleQrError = (err: any) => {
    console.error("QR scan error:", err);
    // Only show error if it's not a common "not found" error
    if (err && err.name !== "NotFoundError") {
      setErrorMessage(`QR scan error: ${err.message || "Unknown error"}`);
    }
  };

  const captureFrame = (barcode: string) => {
    // Take a snapshot from the video to show the "scanned" barcode
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (context) {
        // Set canvas dimensions to match the video
        const videoWidth = videoRef.current.videoWidth || 640;
        const videoHeight = videoRef.current.videoHeight || 480;

        canvas.width = videoWidth;
        canvas.height = videoHeight;

        console.log(`Capturing frame: ${videoWidth}x${videoHeight}`);

        // Draw the current video frame
        context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

        // Draw the barcode data on the canvas for visualization
        context.fillStyle = "rgba(0, 255, 0, 0.3)";
        context.fillRect(canvas.width / 4, canvas.height / 2 - 20, canvas.width / 2, 40);

        context.font = "16px Arial";
        context.fillStyle = "white";
        context.textAlign = "center";
        context.fillText(barcode, canvas.width / 2, canvas.height / 2 + 6);
      }
    }
  };

  // Function to switch between front and rear cameras
  const switchCamera = async () => {
    console.log(`Switching camera from ${facingMode} to ${facingMode === 'user' ? 'environment' : 'user'}`);

    // Toggle facing mode
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacingMode);

    // If already scanning, restart with new camera
    if (scanning) {
      console.log("Restarting scanner with new camera");
      await stopScanning();

      // Small delay to ensure resources are released
      setTimeout(() => {
        startScanning();
      }, 1000);
    }
  };

  useEffect(() => {
    let mounted = true;

    // Initial camera support check
    const initializeCamera = async () => {
      if (!mounted) return;

      // Only check device support if we're not already scanning
      if (!scanning && !cameraInitialized) {
        await checkDeviceSupport();
      }
    };

    initializeCamera();

    return () => {
      mounted = false;
      // Cleanup when component unmounts
      if (scanning || cameraInitialized) {
        releaseCamera();
      }

      // Clean up the barcode reader
      if (readerRef.current) {
        try {
          readerRef.current.reset();
        } catch (error) {
          console.error("Error cleaning up barcode reader:", error);
        }
        readerRef.current = null;
      }
    };
  }, [checkDeviceSupport, scanning, cameraInitialized]);

  // Add effect to handle scan mode changes
  useEffect(() => {
    if (scanning) {
      // If we're already scanning, restart with new mode
      const restartScanning = async () => {
        await stopScanning();
        // Small delay to ensure resources are released
        setTimeout(() => {
          startScanning();
        }, 500);
      };
      restartScanning();
    }
  }, [scanMode]);

  return (
    <Card className="w-full">
      <CardContent className="p-4 space-y-4">
        <Tabs value={scanMode} onValueChange={(value) => setScanMode(value as 'qr' | 'barcode')} className="w-full">
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="qr" className="flex items-center gap-2">
              <QrCode className="h-4 w-4" />
              QR Code
            </TabsTrigger>
            <TabsTrigger value="barcode" className="flex items-center gap-2">
              <Barcode className="h-4 w-4" />
              Barcode
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative bg-black rounded-md overflow-hidden aspect-video flex items-center justify-center">
          {/* QR Scanner component */}
          {scanMode === 'qr' && scanning && (
            <div className="w-full h-full">
              <QrScanner
                delay={300}
                onError={handleQrError}
                onScan={handleQrScan}
                style={{ width: '100%', height: '100%' }}
                constraints={{
                  video: {
                    facingMode: facingMode,
                    width: { min: 640, ideal: 1280, max: 1920 },
                    height: { min: 480, ideal: 720, max: 1080 }
                  }
                }}
                videoStyle={{ width: '100%', height: '100%', objectFit: isMobile ? 'cover' : 'contain' }}
                videoId="qr-video"
                scanDelay={300}
                facingMode={facingMode}
              />
            </div>
          )}

          {/* Video element for barcode scanning */}
          {scanMode === 'barcode' && (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full ${isMobile ? 'object-cover' : 'object-contain'}`}
              style={{ display: scanning && cameraInitialized ? 'block' : 'none' }}
            />
          )}

          {/* Canvas for displaying captured frame */}
          <canvas
            ref={canvasRef}
            className={`w-full h-full ${isMobile ? 'object-cover' : 'object-contain'}`}
            style={{ display: !scanning ? 'block' : 'none' }}
          />

          {/* Loading state */}
          {isInitializing && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
              <div className="flex flex-col items-center">
                <RefreshCw className="h-8 w-8 animate-spin mb-2" />
                <span>Initializing camera...</span>
              </div>
            </div>
          )}

          {/* Camera not initialized yet */}
          {scanning && !cameraInitialized && !isInitializing && (
            <div className="absolute inset-0 flex items-center justify-center text-white">
              <span>Waiting for camera access...</span>
            </div>
          )}

          {/* Show scanning UI */}
          {scanning && cameraInitialized && (
            <div className="absolute inset-0 pointer-events-none">
              {scanMode === 'qr' ? (
                <>
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-green-500 rounded opacity-70"></div>
                  <div className="absolute top-0 left-0 w-full h-full border-t-2 border-green-500 animate-scan"></div>
                </>
              ) : (
                <>
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3/4 h-1/4 border-2 border-green-500 rounded opacity-70"></div>
                  <div className="absolute top-0 left-0 w-full h-full border-t-2 border-green-500 animate-scan"></div>
                </>
              )}
            </div>
          )}

          {/* Camera inactive state */}
          {!scanning && !isInitializing && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center text-white">
                <CameraOff className="h-12 w-12 mb-2 opacity-50" />
                <span className="text-center opacity-70">Camera inactive</span>
              </div>
            </div>
          )}

          {/* Camera switch button - only show when scanning */}
          {scanning && cameraInitialized && (
            <Button
              onClick={switchCamera}
              className="absolute bottom-4 right-4 bg-black/50 hover:bg-black/70 text-white rounded-full p-2"
              size="icon"
              title={`Switch to ${facingMode === 'user' ? 'rear' : 'front'} camera`}
            >
              <FlipHorizontal className="h-5 w-5" />
            </Button>
          )}
        </div>

        {scanResult && (
          <div className="p-2 bg-green-50 border border-green-200 rounded text-sm">
            <p className="font-medium text-green-700">Detected {scanMode === 'qr' ? 'QR code' : 'barcode'}:</p>
            <p className="font-mono">{scanResult}</p>
          </div>
        )}

        {errorMessage && (
          <div className="flex items-center text-red-600 text-sm p-2 bg-red-50 rounded">
            <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {cameraPermissionState === 'denied' && (
          <div className="bg-yellow-50 border border-yellow-300 text-yellow-800 p-3 rounded text-sm">
            <p className="font-semibold">Camera access is blocked</p>
            <p className="mt-1">
              To use the scanner, you need to allow camera access in your browser settings.
              {isMobile ? " Look for camera permissions in your browser settings." : " Click the camera icon in your browser's address bar."}
            </p>
          </div>
        )}

        <div className="flex justify-center">
          {scanning ? (
            <Button
              onClick={stopScanning}
              variant="destructive"
            >
              Stop Scanning
            </Button>
          ) : (
            <Button
              onClick={startScanning}
              className="bg-dna-teal hover:bg-dna-blue"
              disabled={!hasCamera || isInitializing}
            >
              {isInitializing ? (
                <span className="flex items-center">
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Accessing Camera...
                </span>
              ) : (
                <>
                  {scanMode === 'qr' ? (
                    <>
                      <QrCode className="h-4 w-4 mr-2" />
                      Scan QR Code
                    </>
                  ) : (
                    <>
                      <Barcode className="h-4 w-4 mr-2" />
                      Scan Barcode
                    </>
                  )}
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default BarcodeScanner;
