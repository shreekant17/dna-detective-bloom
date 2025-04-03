
import React, { useState } from 'react';
import { AnalysisResult, formatDNASequence } from '@/utils/dnaUtils';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Check, AlertTriangle, Info, Download, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import DatabaseCompare from './DatabaseCompare';
import { downloadReport } from '@/utils/reportUtils';

interface ResultsDisplayProps {
  result: AnalysisResult;
}

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ result }) => {
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  
  const getConfidenceColor = (score: number) => {
    if (score >= 0.9) return 'text-green-600';
    if (score >= 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceIcon = (score: number) => {
    if (score >= 0.9) return <Check className="h-5 w-5 text-green-600" />;
    if (score >= 0.7) return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
    return <AlertTriangle className="h-5 w-5 text-red-600" />;
  };

  const getMatchColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-dna-green';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const handleDownloadReport = () => {
    downloadReport(result);
  };

  const handleCompareWithDatabase = () => {
    setIsCompareOpen(true);
  };

  return (
    <>
      <Card className="w-full">
        <CardHeader className="bg-gradient-to-r from-dna-blue to-dna-teal text-white rounded-t-lg">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl font-bold">Analysis Results</CardTitle>
              <CardDescription className="text-white/80">
                DNA Sequence Match Analysis
              </CardDescription>
            </div>
            <Badge variant="outline" className="bg-white/10 text-white border-white/20">
              {result.barcodeRegion} Region
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="pt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-dna-blue mb-2">Species Identification</h3>
              <div className="space-y-1">
                <p className="text-xl font-semibold">{result.matchedSpecies}</p>
                <p className="text-gray-500">Common name: {result.commonName}</p>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-dna-blue mb-2">Match Confidence</h3>
              <div className="space-y-3">
                <div className="flex items-center">
                  {getConfidenceIcon(result.confidenceScore)}
                  <span className={`ml-2 text-lg font-medium ${getConfidenceColor(result.confidenceScore)}`}>
                    {(result.confidenceScore * 100).toFixed(1)}% Confidence
                  </span>
                </div>
                <Progress 
                  value={result.matchPercentage} 
                  className={`h-2 ${getMatchColor(result.matchPercentage)}`}
                />
                <p className="text-sm text-gray-500">
                  {result.matchPercentage.toFixed(1)}% sequence similarity
                </p>
              </div>
            </div>
          </div>
          
          <Separator />
          
          <div>
            <h3 className="text-lg font-medium text-dna-blue mb-3">DNA Sequence</h3>
            <div className="sequence-container bg-gray-100 p-4 rounded-md overflow-x-auto">
              {formatDNASequence(result.sequence)}
            </div>
            <div className="flex items-center mt-2 text-xs text-gray-500">
              <Info className="h-3 w-3 mr-1" />
              <span>
                Nucleotides: A (Adenine), T (Thymine), G (Guanine), C (Cytosine)
              </span>
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={handleDownloadReport}>
            <Download className="mr-2 h-4 w-4" />
            Download Report
          </Button>
          <Button className="bg-dna-teal hover:bg-dna-blue" onClick={handleCompareWithDatabase}>
            <Database className="mr-2 h-4 w-4" />
            Compare with Database
          </Button>
        </CardFooter>
      </Card>
      
      <DatabaseCompare 
        open={isCompareOpen} 
        setOpen={setIsCompareOpen} 
        result={result} 
      />
    </>
  );
};

export default ResultsDisplay;
