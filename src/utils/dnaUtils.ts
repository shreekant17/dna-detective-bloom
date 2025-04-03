
import React from 'react';

// Mock DNA barcode regions for demonstration
const BARCODE_REGIONS = {
  ITS: 'CGTAACAAGGTTTCCGTAGGTGAACCTGCGGAAGGATCATTG',
  RBCL: 'ATGTCACCACAAACAGAGACTAAAGCAAGT',
  MATK: 'ACCCAGTCCATCTGGAAATCTTGGTTCAGG'
};

// Sample database of plant species DNA
const DNA_DATABASE = [
  { 
    id: 1, 
    species: 'Panax ginseng', 
    commonName: 'Asian Ginseng',
    barcodes: { 
      ITS: 'CGTAACAAGGTTTCCGTAGGTGAACCTGCGGAAGGATCATTGTCGAAACCTGCATAGCAGAA',
      RBCL: 'ATGTCACCACAAACAGAGACTAAAGCAAGTGTTGGATTCAAAGCTGGTGTTAAA',
      MATK: 'ACCCAGTCCATCTGGAAATCTTGGTTCAGGACTCCCCTTCTTATATAATTCT'
    },
    authenticity: 0.97
  },
  { 
    id: 2, 
    species: 'Ocimum basilicum', 
    commonName: 'Sweet Basil',
    barcodes: { 
      ITS: 'CGTAACAAGGTTTCCGTAGGTGAACCTGCGGAAGGATCATTGTCGAAACCTGCATAGCAGA',
      RBCL: 'ATGTCACCACAAACAGAGACTAAAGCAAGTGTTGGATTCAAAGCTGGTGT',
      MATK: 'ACCCAGTCCATCTGGAAATCTTGGTTCAGGACTCCCCCTATATAATTCT'
    },
    authenticity: 0.95
  },
  { 
    id: 3, 
    species: 'Curcuma longa', 
    commonName: 'Turmeric',
    barcodes: { 
      ITS: 'CGTAACAAGGTTTCCGTAGGTGAACCTGCGGAAGGATCATTGAGTGAAACCTGC',
      RBCL: 'ATGTCACCACAAACAGAGACTAAAGCAAGTGTTGGATTTAAAGCTGGTGTT',
      MATK: 'ACCCAGTCCATCTGGAAATCTTGGTTCAGGACTCCCTTCTATATAATTCTCATG'
    },
    authenticity: 0.92
  }
];

type BarcodeRegionKey = keyof typeof BARCODE_REGIONS;
type DNASequence = string;

export type AnalysisResult = {
  matchedSpecies: string;
  commonName: string;
  confidenceScore: number;
  matchPercentage: number;
  barcodeRegion: string;
  sequence: string;
};

/**
 * Validates if a sequence is a proper DNA sequence (contains only A, T, G, C)
 */
export const validateDNASequence = (sequence: string): boolean => {
  const cleanSequence = sequence.toUpperCase().replace(/\s/g, '');
  return /^[ATGC]+$/.test(cleanSequence);
};

/**
 * Determines which barcode region a sequence most likely belongs to
 */
export const identifyBarcodeRegion = (sequence: string): string => {
  let bestMatch = '';
  let highestScore = 0;
  
  Object.entries(BARCODE_REGIONS).forEach(([region, referenceSequence]) => {
    const score = calculateSimilarity(sequence, referenceSequence);
    if (score > highestScore) {
      highestScore = score;
      bestMatch = region;
    }
  });
  
  return bestMatch;
};

/**
 * Calculates similarity score between two sequences
 */
export const calculateSimilarity = (seq1: string, seq2: string): number => {
  // For demonstration, using a simple matching algorithm
  const shortestLength = Math.min(seq1.length, seq2.length);
  let matches = 0;
  
  for (let i = 0; i < shortestLength; i++) {
    if (seq1[i] === seq2[i]) matches++;
  }
  
  return matches / shortestLength;
};

/**
 * Analyzes a DNA sequence and returns the best match from the database
 */
export const analyzeDNASequence = (sequence: string): AnalysisResult | null => {
  if (!validateDNASequence(sequence)) return null;
  
  const cleanSequence = sequence.toUpperCase().replace(/\s/g, '');
  const barcodeRegion = identifyBarcodeRegion(cleanSequence);
  
  let bestMatch = null;
  let highestScore = 0;
  
  DNA_DATABASE.forEach(plant => {
    const plantBarcode = plant.barcodes[barcodeRegion as BarcodeRegionKey];
    if (plantBarcode) {
      const score = calculateSimilarity(cleanSequence, plantBarcode);
      if (score > highestScore) {
        highestScore = score;
        bestMatch = {
          matchedSpecies: plant.species,
          commonName: plant.commonName,
          confidenceScore: plant.authenticity * score,
          matchPercentage: score * 100,
          barcodeRegion,
          sequence: cleanSequence
        };
      }
    }
  });
  
  return bestMatch;
};

/**
 * Formats a DNA sequence for display with color-coded nucleotides
 */
export const formatDNASequence = (sequence: string): JSX.Element[] | null => {
  if (!sequence) return null;
  
  const cleanSequence = sequence.toUpperCase().replace(/\s/g, '');
  
  return cleanSequence.split('').map((nucleotide, index) => {
    const className = `nucleotide nucleotide-${nucleotide}`;
    return React.createElement('span', { key: index, className }, nucleotide);
  });
};

/**
 * Gets sample DNA sequences for demonstration
 */
export const getSampleSequences = (): { [key: string]: string } => {
  return {
    "Asian Ginseng": DNA_DATABASE[0].barcodes.ITS,
    "Sweet Basil": DNA_DATABASE[1].barcodes.RBCL,
    "Turmeric": DNA_DATABASE[2].barcodes.MATK
  };
};

