
import React, { useRef, useState, useEffect } from 'react';
import { Scan, Check, AlertCircle, Camera, CameraOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { validateDNASequence } from '@/utils/dnaUtils';
import { extractDNAFromBarcode, isValidBarcode, createBarcodeReader, processBarcodeResult } from '@/utils/barcodeUtils';
import { useIsMobile } from '@/hooks/use-mobile';

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

  // Check if the browser supports getUserMedia
  const checkCameraSupport = (): boolean => {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  };

  const startScanning = async () => {
    setErrorMessage(null);
    setIsInitializing(true);
    setScanResult(null);
    
    try {
      console.log("Attempting to access camera...");
      
      // Stop any existing streams
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
      
      // Create barcode reader if doesn't exist
      if (!readerRef.current) {
        console.log("Creating barcode reader");
        readerRef.current = createBarcodeReader();
      }
      
      // Configure camera
      const facingMode = isMobile ? "environment" : "user";
      console.log("Using camera facing mode:", facingMode);
      
      const constraints = { 
        video: { 
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      };
      
      console.log("Requesting media with constraints:", constraints);
      
      // Initialize camera
      if (videoRef.current) {
        try {
          await readerRef.current.decodeFromConstraints(
            constraints,
            videoRef.current,
            (result, error) => {
              if (result) {
                console.log("Barcode detected:", result);
                handleBarcodeDetected(result);
              }
              if (error) {
                // Only log errors that aren't just "no barcode found"
                if (error.name !== "NotFoundException") {
                  console.error("Scanning error:", error);
                }
              }
            }
          );
          
          console.log("Camera initialized successfully");
          setScanning(true);
          setCameraInitialized(true);
          setHasCamera(true);
          videoRef.current.style.display = 'block';
        } catch (cameraError) {
          console.error("Error starting camera stream:", cameraError);
          setErrorMessage(`Camera initialization failed: ${cameraError instanceof Error ? cameraError.message : 'Unknown error'}`);
        }
      }
      
      setIsInitializing(false);
    } catch (error) {
      console.error("Camera access error:", error);
      setHasCamera(false);
      setIsInitializing(false);
      setErrorMessage(`Camera access denied or not available: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast({
        title: "Camera Error",
        description: "Could not access camera. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const stopScanning = () => {
    console.log("Stopping scanner...");
    if (readerRef.current) {
      try {
        readerRef.current.reset();
        console.log("Barcode reader reset");
      } catch (error) {
        console.error("Error resetting barcode reader:", error);
      }
    }
    
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => {
        console.log("Stopping track:", track.kind);
        track.stop();
      });
      videoRef.current.srcObject = null;
    }
    
    setScanning(false);
    setCameraInitialized(false);
  };

  const handleBarcodeDetected = (result: any) => {
    const barcodeData = processBarcodeResult(result);
    console.log("Processing barcode:", barcodeData);
    setScanResult(barcodeData);
    
    if (isValidBarcode(barcodeData)) {
      const dnaSequence = extractDNAFromBarcode(barcodeData);
      
      if (dnaSequence && validateDNASequence(dnaSequence)) {
        captureFrame(barcodeData);
        stopScanning();
        
        toast({
          title: "Barcode Detected",
          description: `Found barcode: ${barcodeData}`,
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
    } else {
      console.log("Invalid barcode format detected");
      toast({
        title: "Invalid Barcode Format",
        description: "The scanned barcode is not in a recognized format.",
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
    const isCameraSupported = checkCameraSupport();
    if (!isCameraSupported) {
      setHasCamera(false);
      setErrorMessage("Your browser doesn't support camera access");
      return;
    }

    // Check if camera permissions exist
    const checkCameraPermission = async () => {
      try {
        // Just check if we can get a list of devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        if (videoDevices.length === 0) {
          setHasCamera(false);
          setErrorMessage("No camera detected on this device");
        } else {
          console.log("Found camera devices:", videoDevices.length);
        }
      } catch (error) {
        console.error("Error checking camera:", error);
        setHasCamera(false);
        setErrorMessage("Error accessing camera devices");
      }
    };
    
    checkCameraPermission();

    return () => {
      // Cleanup: ensure camera is turned off when component unmounts
      stopScanning();
      
      // Clean up the barcode reader
      if (readerRef.current) {
        try {
          readerRef.current.reset();
        } catch (error) {
          console.error("Error cleaning up barcode reader:", error);
        }
      }
    };
  }, []);

  return (
    <Card className="w-full">
      <CardContent className="p-4 space-y-4">
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
                <Camera className="h-8 w-8 animate-pulse mb-2" />
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
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3/4 h-1/4 border-2 border-green-500 rounded opacity-70"></div>
              <div className="absolute top-0 left-0 w-full h-full border-t-2 border-green-500 animate-scan"></div>
            </div>
          )}
          
          {/* Show "no camera" placeholder when not scanning */}
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
            <p className="font-medium text-green-700">Detected barcode:</p>
            <p className="font-mono">{scanResult}</p>
          </div>
        )}

        {errorMessage && (
          <div className="flex items-center text-red-600 text-sm p-2 bg-red-50 rounded">
            <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>{errorMessage}</span>
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
                  <span className="h-4 w-4 mr-2 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                  Accessing Camera...
                </span>
              ) : (
                <>
                  <Scan className="h-4 w-4 mr-2" />
                  Scan Barcode
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
