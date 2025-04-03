
import React, { useState, useEffect } from 'react';
import { analyzeDNASequence, AnalysisResult } from '@/utils/dnaUtils';
import { Loader2 } from 'lucide-react';
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

  useEffect(() => {
    if (!sequence || !isAnalyzing) return;

    // Simulate processing delay for UX purposes
    const timer = setTimeout(() => {
      const analysisResult = analyzeDNASequence(sequence);
      setResult(analysisResult);
      setIsAnalyzing(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, [sequence, isAnalyzing, setIsAnalyzing]);

  if (!isAnalyzing && !result) return null;

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
      ) : result ? (
        <ResultsDisplay result={result} />
      ) : null}
    </div>
  );
};

export default SequenceAnalyzer;
