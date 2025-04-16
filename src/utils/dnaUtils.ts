import React from 'react';
import { analyzeDNASequence as analyzeDNASequenceAPI, getSampleSequences as getSampleSequencesAPI } from './api';

// Reference DNA barcode regions for identification
export const BARCODE_REGIONS = {
  ITS: 'CGTAACAAGGTTTCCGTAGGTGAACCTGCGGAAGGATCATTG',
  RBCL: 'ATGTCACCACAAACAGAGACTAAAGCAAGT',
  MATK: 'ACCCAGTCCATCTGGAAATCTTGGTTCAGG'
};

// Type definitions
export type BarcodeRegionKey = keyof typeof BARCODE_REGIONS;

export interface AnalysisResult {
  matchedSpecies: string;
  commonName: string;
  confidenceScore: number;
  matchPercentage: number;
  barcodeRegion: string;
  sequence: string;
}

/**
 * Validates if a string is a valid DNA sequence (contains only A, T, G, C)
 */
export const validateDNASequence = (sequence: string): boolean => {
  const cleanSequence = sequence.toUpperCase().replace(/\s/g, '');
  return /^[ATGC]+$/.test(cleanSequence);
};

/**
 * Calculates similarity between two DNA sequences
 */
export const calculateSimilarity = (seq1: string, seq2: string): number => {
  const shortestLength = Math.min(seq1.length, seq2.length);
  if (shortestLength === 0) return 0;

  let matches = 0;
  for (let i = 0; i < shortestLength; i++) {
    if (seq1[i] === seq2[i]) {
      matches++;
    }
  }

  return matches / shortestLength;
};

/**
 * Identifies which barcode region a sequence belongs to
 */
export const identifyBarcodeRegion = (sequence: string): string => {
  let bestMatch = '';
  let highestScore = 0;

  for (const [region, referenceSequence] of Object.entries(BARCODE_REGIONS)) {
    const score = calculateSimilarity(sequence, referenceSequence);
    if (score > highestScore) {
      highestScore = score;
      bestMatch = region;
    }
  }

  return bestMatch;
};

/**
 * Analyzes a DNA sequence and returns the best match from the database
 */
export const analyzeDNASequence = async (sequence: string): Promise<AnalysisResult | null> => {
  if (!validateDNASequence(sequence)) return null;

  try {
    return await analyzeDNASequenceAPI(sequence);
  } catch (error) {
    console.error("Error analyzing DNA sequence:", error);
    return null;
  }
};

/**
 * Gets sample DNA sequences from the API
 */
export const getSampleSequences = async (): Promise<{ [key: string]: string }> => {
  try {
    return await getSampleSequencesAPI();
  } catch (error) {
    console.error("Error getting sample sequences:", error);
    return {};
  }
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

