
import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { validateDNASequence, getSampleSequences } from '@/utils/dnaUtils';
import { toast } from '@/components/ui/use-toast';

interface SequenceUploaderProps {
  onSequenceSubmit: (sequence: string) => void;
}

const SequenceUploader: React.FC<SequenceUploaderProps> = ({ onSequenceSubmit }) => {
  const [sequence, setSequence] = useState('');
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const sampleSequences = getSampleSequences();

  const handleSequenceChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newSequence = e.target.value;
    setSequence(newSequence);
    
    if (newSequence.trim().length > 0) {
      setIsValid(validateDNASequence(newSequence));
    } else {
      setIsValid(null);
    }
  };

  const handleSubmit = () => {
    if (!sequence.trim()) {
      toast({
        title: "Empty Sequence",
        description: "Please enter a DNA sequence or upload a file.",
        variant: "destructive"
      });
      return;
    }

    if (!isValid) {
      toast({
        title: "Invalid Sequence",
        description: "Please enter a valid DNA sequence (only A, T, G, C allowed).",
        variant: "destructive"
      });
      return;
    }

    onSequenceSubmit(sequence);
    toast({
      title: "Sequence Submitted",
      description: "Your DNA sequence is being analyzed.",
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setSequence(content);
      setIsValid(validateDNASequence(content));
    };
    reader.readAsText(file);
  };

  const handleSampleSelect = (sample: string) => {
    setSequence(sampleSequences[sample]);
    setIsValid(true);
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="text-dna-blue">DNA Sequence Input</CardTitle>
        <CardDescription>
          Enter a DNA sequence to analyze, upload a FASTA file, or select a sample.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="input">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="input">Manual Input</TabsTrigger>
            <TabsTrigger value="upload">File Upload</TabsTrigger>
            <TabsTrigger value="sample">Sample Sequences</TabsTrigger>
          </TabsList>
          
          <TabsContent value="input" className="space-y-4">
            <Textarea 
              placeholder="Enter DNA sequence (A, T, G, C only)..."
              value={sequence}
              onChange={handleSequenceChange}
              className="min-h-[150px] font-mono"
            />
            {isValid !== null && (
              <div className="flex items-center mt-2">
                {isValid ? (
                  <div className="flex items-center text-green-600">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    <span>Valid DNA sequence</span>
                  </div>
                ) : (
                  <div className="flex items-center text-red-600">
                    <XCircle className="h-4 w-4 mr-2" />
                    <span>Invalid DNA sequence (use only A, T, G, C)</span>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="upload" className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Upload className="h-10 w-10 mx-auto mb-2 text-gray-400" />
              <p className="mb-2 text-sm text-gray-500">Upload a FASTA or text file containing DNA sequence</p>
              <label className="inline-flex">
                <input
                  type="file"
                  accept=".fasta,.txt,.fas"
                  onChange={handleFileUpload}
                  className="sr-only"
                />
                <Button variant="outline" className="cursor-pointer">
                  <FileText className="h-4 w-4 mr-2" />
                  Select File
                </Button>
              </label>
            </div>
            {sequence && (
              <div className="sequence-container">
                <p className="text-xs text-gray-500 mb-1">Uploaded sequence:</p>
                {sequence.substring(0, 100)}...
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="sample" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.keys(sampleSequences).map((name) => (
                <Button 
                  key={name}
                  variant="outline" 
                  className="h-auto py-4 px-3 flex flex-col items-center justify-center text-center"
                  onClick={() => handleSampleSelect(name)}
                >
                  <span className="font-medium mb-1">{name}</span>
                  <span className="text-xs font-mono text-gray-500">
                    {sampleSequences[name].substring(0, 15)}...
                  </span>
                </Button>
              ))}
            </div>
            {sequence && (
              <div className="sequence-container mt-4">
                <p className="text-xs text-gray-500 mb-1">Selected sample:</p>
                {sequence.substring(0, 100)}...
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="mt-6">
          <Button 
            onClick={handleSubmit}
            className="w-full bg-dna-teal hover:bg-dna-blue"
            disabled={!sequence || isValid === false}
          >
            Analyze DNA Sequence
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SequenceUploader;
