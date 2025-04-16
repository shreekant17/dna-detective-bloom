import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Scan, Check, AlertCircle, Camera, CameraOff, RefreshCw, QrCode, Barcode } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

  // Function to release camera resources
  const releaseCamera = useCallback(() => {
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
  }, []);

  // Check browser compatibility and camera permissions
  const checkDeviceSupport = useCallback(async () => {
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
  }, [isMobile]);

  // Manual frame capture and processing for better performance
  const captureAndDecode = useCallback(() => {
    if (!videoRef.current || !readerRef.current || !canvasRef.current || !streamRef.current) {
      return;
    }

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (!context || video.readyState !== 4) return;

      // Match canvas size to video
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;

      if (canvas.width !== videoWidth || canvas.height !== videoHeight) {
        canvas.width = videoWidth;
        canvas.height = videoHeight;
      }

      // Draw the current frame to canvas
      context.drawImage(video, 0, 0, videoWidth, videoHeight);

      // Get the image data from the canvas for processing
      const imageData = context.getImageData(0, 0, videoWidth, videoHeight);

      // Use ZXing to decode the image
      try {
        const result = readerRef.current.decodeFromImageData(imageData);
        if (result && result.getText()) {
          console.log("Barcode detected:", result.getText());
          handleBarcodeDetected(result);
        }
      } catch (error) {
        // Most errors will be "not found" which is expected
        if ((error as Error).name !== 'NotFoundException') {
          console.error("Decoding error:", error);
        }
      }
    } catch (error) {
      console.error("Error in capture and decode cycle:", error);
    }
  }, []);

  const startScanning = async () => {
    setErrorMessage(null);
    setIsInitializing(true);
    setScanResult(null);

    try {
      // First check if device has camera support
      const hasSupport = await checkDeviceSupport();
      if (!hasSupport) {
        setIsInitializing(false);
        return;
      }

      console.log(`Starting camera on ${isMobile ? 'mobile' : 'desktop'} device...`);

      // Ensure any previous resources are released
      releaseCamera();

      // Create barcode reader if doesn't exist
      if (!readerRef.current) {
        console.log("Creating barcode reader");
        readerRef.current = createBarcodeReader(scanMode);
      }

      try {
        // Get optimal constraints based on device type
        const constraints = await getOptimalCameraConstraints(isMobile, scanMode);
        console.log("Using camera constraints:", JSON.stringify(constraints));

        // Attempt to get camera stream
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;

          // Set up event handlers for the video element
          videoRef.current.onloadedmetadata = () => {
            console.log(`Video ready: ${videoRef.current?.videoWidth || 0}×${videoRef.current?.videoHeight || 0}`);

            if (videoRef.current) {
              videoRef.current.play().catch(e => {
                console.error("Error playing video:", e);
                throw e; // Re-throw to be caught by outer try-catch
              });
            }
          };

          videoRef.current.onplaying = () => {
            console.log("Video is now playing");
            setCameraInitialized(true);
            setScanning(true);
            setHasCamera(true);
            setIsInitializing(false);

            // Start capturing frames at regular intervals for decoding
            if (decodeIntervalRef.current) {
              window.clearInterval(decodeIntervalRef.current);
            }

            decodeIntervalRef.current = window.setInterval(captureAndDecode, 200);
          };

          videoRef.current.onerror = (e) => {
            console.error("Video element error:", e);
            setErrorMessage("Video initialization failed");
            setIsInitializing(false);
            releaseCamera();
          };
        }
      } catch (cameraError) {
        console.error("Error accessing camera with optimal constraints:", cameraError);

        // Fallback to basic constraints
        try {
          console.log("Trying fallback camera access method...");
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          streamRef.current = stream;

          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.onloadedmetadata = () => {
              if (videoRef.current) videoRef.current.play();
            };

            videoRef.current.onplaying = () => {
              console.log("Video is now playing (fallback method)");
              setCameraInitialized(true);
              setScanning(true);
              setHasCamera(true);
              setIsInitializing(false);

              if (decodeIntervalRef.current) {
                window.clearInterval(decodeIntervalRef.current);
              }

              decodeIntervalRef.current = window.setInterval(captureAndDecode, 200);
            };
          }
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

      // Set timeout to handle case where video never fires onplaying
      initScannerTimerRef.current = setTimeout(() => {
        if (!cameraInitialized && isInitializing) {
          console.log("Camera initialization timed out");
          setErrorMessage("Camera initialization timed out. Please try again.");
          setIsInitializing(false);
          releaseCamera();
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

  const stopScanning = () => {
    console.log("Stopping scanner...");
    releaseCamera();
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
          stopScanning();

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

  useEffect(() => {
    // Initial camera support check
    checkDeviceSupport();

    return () => {
      // Cleanup when component unmounts
      releaseCamera();

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
  }, [checkDeviceSupport, releaseCamera, isMobile]);

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
          {/* Video element for camera preview */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{ display: scanning && cameraInitialized ? 'block' : 'none' }}
          />

          {/* Canvas for displaying captured frame */}
          <canvas
            ref={canvasRef}
            className="w-full h-full object-cover"
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
