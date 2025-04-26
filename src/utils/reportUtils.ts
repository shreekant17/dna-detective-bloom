
import { AnalysisResult } from './dnaUtils';

/**
 * Generates a CSV report content from DNA analysis result
 */
export const generateCSVReport = (result: AnalysisResult): string => {
  const headers = [
    'Matched Species',
    'Common Name',
    'Confidence Score (%)',
    'Match Percentage (%)',
    'Barcode Region',
    'Sequence'
  ].join(',');
  
  const values = [
    result.matchedSpecies,
    result.commonName,
    (result.confidenceScore * 100).toFixed(1),
    result.matchPercentage.toFixed(1),
    result.barcodeRegion,
    result.sequence
  ].join(',');
  
  return `${headers}\n${values}`;
};

/**
 * Downloads DNA analysis result as a CSV file
 */
export const downloadReport = (result: AnalysisResult): void => {
  const csvContent = generateCSVReport(result);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  // Set link properties
  link.setAttribute('href', url);
  link.setAttribute('download', `dna-analysis-${result.matchedSpecies.replace(/\s+/g, '-').toLowerCase()}.csv`);
  link.style.visibility = 'hidden';
  
  // Append to document, trigger click and clean up
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
