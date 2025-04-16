/**
 * Utility functions for working with DNA barcodes
 */
import { BrowserMultiFormatReader, Result, BarcodeFormat, DecodeHintType } from '@zxing/library';
import { getSampleSequences } from './api';

// Extract DNA sequence from barcode data
export const extractDNAFromBarcode = async (barcodeData: string): Promise<string | null> => {
  // Basic check to see if the barcode data might contain DNA
  if (/^[ATGC]+$/.test(barcodeData)) {
    console.log("Barcode is already a DNA sequence");
    return barcodeData; // Already a DNA sequence
  }

  // Log the barcode we're looking up
  console.log("Looking up DNA sequence for barcode:", barcodeData);

  try {
    // Get samples from the API
    const samples = await getSampleSequences();

    // Check if the barcode matches any known samples
    for (const [commonName, sequence] of Object.entries(samples)) {
      if (commonName.includes(barcodeData) || barcodeData.includes(commonName)) {
        console.log(`Found matching DNA sequence for ${commonName}`);
        return sequence;
      }
    }

    console.log("No DNA sequence found for barcode");
    return null;
  } catch (error) {
    console.error("Error fetching DNA sequences:", error);
    return null;
  }
};

// Function to validate if a string could be a barcode
export const isValidBarcode = (code: string, scanMode: 'qr' | 'barcode' = 'barcode'): boolean => {
  if (scanMode === 'qr') {
    // QR codes can contain any text, so we just need to check if it's not empty
    const isValid = code.length > 0;
    console.log(`Validating QR code "${code}": ${isValid}`);
    return isValid;
  } else {
    // Traditional barcodes usually have a specific format
    // Support for common barcode formats: CODE_128, CODE_39, EAN_13, EAN_8, UPC_A, UPC_E
    const isValid = /^[A-Z0-9]+$/.test(code) && code.length >= 3;
    console.log(`Validating barcode "${code}": ${isValid}`);
    return isValid;
  }
};

// Create a barcode reader instance with optimizations for mobile
export const createBarcodeReader = (scanMode: 'qr' | 'barcode' = 'qr'): BrowserMultiFormatReader => {
  console.log(`Creating barcode reader for mode: ${scanMode}`);

  const hints = new Map();

  // Set formats to scan for based on scan mode
  if (scanMode === 'qr') {
    console.log("Configuring for QR code scanning");
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.QR_CODE,
      BarcodeFormat.DATA_MATRIX,
      BarcodeFormat.AZTEC
    ]);
  } else {
    console.log("Configuring for traditional barcode scanning");
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.ITF,
      BarcodeFormat.PDF_417
    ]);
  }

  // Additional hints to improve scanning performance
  hints.set(DecodeHintType.TRY_HARDER, true);
  hints.set(DecodeHintType.ASSUME_GS1, false);

  // For QR codes, add specific hints
  if (scanMode === 'qr') {
    hints.set(DecodeHintType.CHARACTER_SET, 'UTF-8');
    hints.set(DecodeHintType.PURE_BARCODE, false);
    // Add more aggressive scanning for QR codes
    hints.set(DecodeHintType.TRY_HARDER, true);
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]);
  }

  try {
    const reader = new BrowserMultiFormatReader(hints);
    console.log("Barcode reader created with hints:", hints);

    // Log the available methods on the reader
    console.log("Reader methods:", Object.keys(reader));

    return reader;
  } catch (error) {
    console.error("Error creating barcode reader:", error);
    // Fallback to a basic reader without hints
    return new BrowserMultiFormatReader();
  }
};

// Process a successful scan result
export const processBarcodeResult = (result: Result): string => {
  return result.getText();
};

// Function to handle camera selection for mobile devices
export const getOptimalCameraConstraints = async (isMobile: boolean, scanMode: 'qr' | 'barcode' = 'qr'): Promise<MediaStreamConstraints> => {
  try {
    // First try to enumerate available devices to find rear camera on mobile
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(device => device.kind === 'videoinput');

    console.log(`Found ${videoDevices.length} video input devices`);

    if (isMobile && videoDevices.length > 0) {
      // Look for keywords in device labels that might indicate rear camera
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
            width: { min: 640, ideal: scanMode === 'qr' ? 1280 : 1920, max: 1920 },
            height: { min: 480, ideal: scanMode === 'qr' ? 720 : 1080, max: 1080 },
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
          width: { min: 640, ideal: scanMode === 'qr' ? 1280 : 1920, max: 1920 },
          height: { min: 480, ideal: scanMode === 'qr' ? 720 : 1080, max: 1080 }
        },
        audio: false
      };
    }

    // For desktop or if mobile detection failed
    console.log(`Using ${isMobile ? 'mobile' : 'desktop'} default camera settings`);
    return {
      video: {
        width: { ideal: scanMode === 'qr' ? 1280 : 1920 },
        height: { ideal: scanMode === 'qr' ? 720 : 1080 },
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
