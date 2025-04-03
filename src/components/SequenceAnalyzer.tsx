
import React, { useState, useEffect } from 'react';
import { AnalysisResult } from '@/utils/dnaUtils';
import { analyzeDNASequence as apiAnalyzeDNASequence } from '@/utils/api';
import ResultsDisplay from './ResultsDisplay';

interface SequenceAnalyzerProps {
  sequence: string;
  isAnalyzing: boolean;
  setIsAnalyzing: (value: boolean) => void;
}

const SequenceAnalyzer: React.FC<SequenceAnalyzerProps> = ({ 
  sequence, 
  isAnalyzing, 
  setIsAnalyzing 
}) => {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sequence || !isAnalyzing) return;

    const performAnalysis = async () => {
      try {
        // Artificial delay for better UX
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const analysisResult = await apiAnalyzeDNASequence(sequence);
        if (analysisResult) {
          setResult(analysisResult);
          setError(null);
        } else {
          setError('Failed to analyze sequence. Please try again.');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        console.error('Analysis error:', err);
      } finally {
        setIsAnalyzing(false);
      }
    };

    performAnalysis();

    return () => {
      // Cleanup if needed
    };
  }, [sequence, isAnalyzing, setIsAnalyzing]);

  if (!isAnalyzing && !result && !error) return null;

  return (
    <div className="w-full max-w-3xl mx-auto mt-8 animate-fade-in">
      {isAnalyzing ? (
        <div className="flex flex-col items-center justify-center p-12">
          <div className="dna-double-helix mb-6">
            <div className="dna-strand"></div>
            <div className="dna-strand"></div>
          </div>
          <p className="text-lg font-medium text-dna-blue">Analyzing DNA sequence...</p>
          <p className="text-sm text-gray-500 mt-2">
            Identifying barcode regions and comparing to reference database
          </p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-md p-6 text-center">
          <p className="text-red-600 font-medium">{error}</p>
          <p className="text-sm text-gray-500 mt-2">
            Please check your sequence and try again
          </p>
        </div>
      ) : result ? (
        <ResultsDisplay result={result} />
      ) : null}
    </div>
  );
};

export default SequenceAnalyzer;
