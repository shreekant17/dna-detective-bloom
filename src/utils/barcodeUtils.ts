
/**
 * Utility functions for working with DNA barcodes
 */

// This is a simplified demonstration function to extract DNA sequences from barcodes
// In a real application, this would involve more sophisticated parsing based on the barcode format
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
  const isValid = /^[A-Z0-9]+$/.test(code) && code.length >= 8;
  console.log(`Validating barcode "${code}": ${isValid}`);
  return isValid;
};
