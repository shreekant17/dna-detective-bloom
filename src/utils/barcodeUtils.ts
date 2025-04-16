
/**
 * Utility functions for working with DNA barcodes
 */
import { BrowserMultiFormatReader, Result, BarcodeFormat, DecodeHintType } from '@zxing/library';

// Extract DNA sequence from barcode data
export const extractDNAFromBarcode = (barcodeData: string): string | null => {
  // Basic check to see if the barcode data might contain DNA
  if (/^[ATGC]+$/.test(barcodeData)) {
    console.log("Barcode is already a DNA sequence");
    return barcodeData; // Already a DNA sequence
  }
  
  // Log the barcode we're looking up
  console.log("Looking up DNA sequence for barcode:", barcodeData);
  
  // For a real system, you'd have a database or API to look up the DNA sequence
  // associated with this barcode. This is a simplified example.
  const knownBarcodes: Record<string, string> = {
    "GINSENG123": "CGTAACAAGGTTTCCGTAGGTGAACCTGCGGAAGGATCATTGTCGAAACCTGCATAGCAGAA",
    "BASIL456": "ATGTCACCACAAACAGAGACTAAAGCAAGTGTTGGATTCAAAGCTGGTGTTAAA",
    "TURMERIC789": "ACCCAGTCCATCTGGAAATCTTGGTTCAGGACTCCCTTCTATATAATTCTCATG",
    // More could be added here
  };
  
  const dnaSequence = knownBarcodes[barcodeData] || null;
  console.log("DNA sequence found:", dnaSequence ? "Yes" : "No");
  
  return dnaSequence;
};

// Function to validate if a string could be a barcode
export const isValidBarcode = (code: string): boolean => {
  // Simple validation - barcodes usually have a specific format
  const isValid = /^[A-Z0-9]+$/.test(code) && code.length >= 3;
  console.log(`Validating barcode "${code}": ${isValid}`);
  return isValid;
};

// Create a barcode reader instance with optimizations for mobile
export const createBarcodeReader = (): BrowserMultiFormatReader => {
  const hints = new Map();
  
  // Set formats to scan for - common barcode formats
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.QR_CODE,
    BarcodeFormat.DATA_MATRIX,
    BarcodeFormat.CODE_128,
    BarcodeFormat.CODE_39,
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.UPC_A,
    BarcodeFormat.UPC_E,
    BarcodeFormat.ITF,
    BarcodeFormat.AZTEC,
    BarcodeFormat.PDF_417
  ]);
  
  // Additional hints to improve mobile performance
  hints.set(DecodeHintType.TRY_HARDER, true);
  hints.set(DecodeHintType.ASSUME_GS1, false);
  
  return new BrowserMultiFormatReader(hints);
};

// Process a successful scan result
export const processBarcodeResult = (result: Result): string => {
  return result.getText();
};

// Function to handle camera selection for mobile devices
export const getOptimalCameraConstraints = async (isMobile: boolean): Promise<MediaStreamConstraints> => {
  try {
    // First try to enumerate available devices to find rear camera on mobile
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(device => device.kind === 'videoinput');
    
    console.log(`Found ${videoDevices.length} video input devices`);
    
    if (isMobile && videoDevices.length > 0) {
      // Look for keywords in device labels that might indicate rear camera
      // Many mobile devices name their rear cameras with these terms
      const rearCameraKeywords = ['back', 'rear', 'environment', '0', 'main'];
      
      // Log all available video devices to help with debugging
      videoDevices.forEach((device, index) => {
        console.log(`Camera ${index}: ${device.label || 'unnamed'} (${device.deviceId.substring(0, 8)}...)`);
      });
      
      // Try to find rear camera by looking for common keywords in labels
      const rearCamera = videoDevices.find(device => {
        const label = device.label.toLowerCase();
        return rearCameraKeywords.some(keyword => label.includes(keyword));
      });
      
      if (rearCamera) {
        console.log(`Selected rear camera: ${rearCamera.label}`);
        return {
          video: {
            deviceId: { exact: rearCamera.deviceId },
            width: { min: 640, ideal: 1280, max: 1920 },
            height: { min: 480, ideal: 720, max: 1080 },
            facingMode: "environment"
          },
          audio: false
        };
      }
      
      // If we couldn't identify a rear camera by label, use facingMode constraint
      console.log("Using facingMode: environment as fallback");
      return {
        video: {
          facingMode: { ideal: "environment" },
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 480, ideal: 720, max: 1080 }
        },
        audio: false
      };
    } 
    
    // For desktop or if mobile detection failed
    console.log(`Using ${isMobile ? 'mobile' : 'desktop'} default camera settings`);
    return {
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: isMobile ? "environment" : "user"
      },
      audio: false
    };
  } catch (error) {
    console.error("Error during device enumeration:", error);
    // Fallback to basic constraints
    return {
      video: true,
      audio: false
    };
  }
};

// Check if the current browser supports modern camera access APIs
export const checkBrowserCompatibility = (): { isCompatible: boolean; issues: string[] } => {
  const issues: string[] = [];
  
  // Check for getUserMedia support
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    issues.push("Camera API not supported in this browser");
  }
  
  // Check for secure context (needed for camera access)
  if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
    issues.push("Camera access requires HTTPS (except on localhost)");
  }
  
  // Check for specific browser issues
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (userAgent.indexOf('iphone') > -1 || userAgent.indexOf('ipad') > -1) {
    const iOSMatch = userAgent.match(/os (\d+)_/);
    if (iOSMatch && parseInt(iOSMatch[1]) < 13) {
      issues.push("iOS 13 or later is recommended for camera access");
    }
  }
  
  return {
    isCompatible: issues.length === 0,
    issues
  };
};
