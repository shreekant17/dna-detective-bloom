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
export const getOptimalCameraConstraints = async (isMobile: boolean, scanMode: 'qr' | 'barcode' = 'barcode'): Promise<MediaStreamConstraints> => {
  console.log(`Getting optimal camera constraints for ${isMobile ? 'mobile' : 'desktop'} device in ${scanMode} mode`);

  // Base constraints that work well for most devices
  const baseConstraints: MediaTrackConstraints = {
    facingMode: 'environment',
    width: { ideal: 1280 },
    height: { ideal: 720 },
    aspectRatio: { ideal: 16 / 9 }
  };

  // Mobile-specific optimizations
  if (isMobile) {
    // For mobile devices, prioritize performance over resolution
    return {
      video: {
        ...baseConstraints,
        width: { ideal: 1280, max: 1920 },
        height: { ideal: 720, max: 1080 },
        frameRate: { ideal: 30, max: 60 },
        // Add mobile-specific constraints
        advanced: [
          { width: { min: 640 }, height: { min: 480 } }, // Minimum resolution
          { aspectRatio: { ideal: 16 / 9 } }, // Preferred aspect ratio
          { frameRate: { min: 15 } } // Minimum frame rate
        ]
      },
      audio: false
    };
  }

  // Desktop-specific optimizations
  return {
    video: {
      ...baseConstraints,
      width: { ideal: 1920, max: 2560 },
      height: { ideal: 1080, max: 1440 },
      frameRate: { ideal: 30, max: 60 },
      // Add desktop-specific constraints
      advanced: [
        { width: { min: 1280 }, height: { min: 720 } }, // Higher minimum resolution
        { aspectRatio: { ideal: 16 / 9 } }, // Preferred aspect ratio
        { frameRate: { min: 24 } } // Higher minimum frame rate
      ]
    },
    audio: false
  };
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
