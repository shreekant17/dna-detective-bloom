import React, { useState, useEffect, useRef } from 'react';
import { Upload, FileText, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { validateDNASequence } from '@/utils/dnaUtils';
import { getSampleSequences } from '@/utils/api';
import { toast } from '@/components/ui/use-toast';
import { getSampleSequences as getLocalSampleSequences } from '@/utils/dnaUtils';

interface SequenceUploaderProps {
  onSequenceSubmit: (sequence: string) => void;
}

const SequenceUploader: React.FC<SequenceUploaderProps> = ({ onSequenceSubmit }) => {
  const [sequence, setSequence] = useState('');
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [sampleSequences, setSampleSequences] = useState<{[key: string]: string}>({});
  const [isLoadingSamples, setIsLoadingSamples] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const loadSampleSequences = async () => {
      setIsLoadingSamples(true);
      try {
        const apiSamples = await getSampleSequences();
        if (Object.keys(apiSamples).length > 0) {
          setSampleSequences(apiSamples);
        } else {
          // Fallback to local samples if API fails
          setSampleSequences(getLocalSampleSequences());
        }
      } catch (error) {
        console.error('Failed to load sample sequences:', error);
        setSampleSequences(getLocalSampleSequences());
        toast({
          title: 'Warning',
          description: 'Using local sample sequences. Backend connection failed.',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingSamples(false);
      }
    };

    loadSampleSequences();
  }, []);

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
    if (!e.target.files) {
      console.log("No files selected");
      return;
    }
    
    const file = e.target.files[0];
    if (!file) {
      console.log("No file found in selection");
      return;
    }

    console.log("File selected:", file.name);
    setFileName(file.name);
    
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const validExtensions = ['fasta', 'fas', 'txt'];
    
    if (!validExtensions.includes(fileExt || '')) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a .fasta, .fas, or .txt file.",
        variant: "destructive"
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        if (!event.target?.result) {
          console.error('File read resulted in null content');
          return;
        }
        
        const content = event.target.result as string;
        console.log("File content read, length:", content.length);
        let cleanedContent = content;
        
        // Handle FASTA format (remove header lines starting with >)
        if (fileExt === 'fasta' || fileExt === 'fas') {
          cleanedContent = content
            .split('\n')
            .filter(line => !line.startsWith('>'))
            .join('')
            .trim();
        }
        
        setSequence(cleanedContent);
        const isSequenceValid = validateDNASequence(cleanedContent);
        setIsValid(isSequenceValid);
        
        if (!isSequenceValid) {
          toast({
            title: "Invalid DNA Sequence",
            description: "The uploaded file does not contain a valid DNA sequence.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "File Uploaded",
            description: `${file.name} successfully loaded.`,
          });
        }
      } catch (error) {
        console.error('Error processing file:', error);
        toast({
          title: "Error Processing File",
          description: "Could not read the DNA sequence from the file.",
          variant: "destructive"
        });
      }
    };
    
    reader.onerror = (error) => {
      console.error('FileReader error:', error);
      toast({
        title: "Error Reading File",
        description: "There was an error reading the file.",
        variant: "destructive"
      });
    };
    
    reader.readAsText(file);
  };

  const clearFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setFileName(null);
    setSequence('');
    setIsValid(null);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      console.log("File dropped:", files[0].name);
      
      // Create a synthetic event object
      const syntheticEvent = {
        target: {
          files
        }
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      
      handleFileUpload(syntheticEvent);
    }
  };

  const handleSampleSelect = (sample: string) => {
    setSequence(sampleSequences[sample]);
    setIsValid(true);
  };

  const handleTabChange = (value: string) => {
    // When switching to file upload tab, ensure the file input is reset
    if (value === 'upload' && fileInputRef.current) {
      // Wait for the tab change to complete before focusing
      setTimeout(() => {
        if (fileInputRef.current) {
          fileInputRef.current.click();
        }
      }, 100);
    }
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
        <Tabs defaultValue="input" onValueChange={handleTabChange}>
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
            <div 
              className={`border-2 border-dashed rounded-lg p-6 text-center 
                ${isDragging ? 'border-dna-blue bg-dna-blue/5' : ''}
                ${fileName ? 'border-dna-green bg-dna-green/5' : 'border-gray-300'}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Upload className={`h-10 w-10 mx-auto mb-2 
                ${isDragging ? 'text-dna-blue' : ''}
                ${fileName ? 'text-dna-green' : 'text-gray-400'}`} 
              />
              
              {fileName ? (
                <div className="space-y-2">
                  <p className="mb-2 text-sm text-dna-blue font-medium">File: {fileName}</p>
                  <div className="flex justify-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearFileInput}
                      className="text-red-500 border-red-200 hover:bg-red-50"
                    >
                      Clear file
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-dna-blue"
                    >
                      Change file
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="mb-2 text-sm text-gray-500">Upload a FASTA or text file containing DNA sequence</p>
                  <p className="mb-3 text-xs text-gray-400">or drag and drop file here</p>
                  <label className="inline-flex">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".fasta,.fas,.txt"
                      onChange={handleFileUpload}
                      className="sr-only"
                    />
                    <Button variant="outline" className="cursor-pointer" 
                      onClick={() => fileInputRef.current?.click()}>
                      <FileText className="h-4 w-4 mr-2" />
                      Select File
                    </Button>
                  </label>
                </>
              )}
            </div>
            
            {sequence && (
              <div className="mt-4 p-3 bg-gray-50 rounded border border-gray-200 font-mono">
                <p className="text-xs text-gray-500 mb-1">Uploaded sequence:</p>
                <div className="text-sm overflow-hidden text-ellipsis">
                  {sequence.length > 120 ? (
                    <>{sequence.substring(0, 100)}... <span className="text-gray-500 text-xs">({sequence.length} characters)</span></>
                  ) : (
                    sequence
                  )}
                </div>
                
                {isValid !== null && (
                  <div className="flex items-center mt-2">
                    {isValid ? (
                      <div className="flex items-center text-green-600 text-xs">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        <span>Valid DNA sequence</span>
                      </div>
                    ) : (
                      <div className="flex items-center text-red-600 text-xs">
                        <XCircle className="h-3 w-3 mr-1" />
                        <span>Invalid DNA sequence</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="sample" className="space-y-4">
            {isLoadingSamples ? (
              <div className="text-center py-4">Loading sample sequences...</div>
            ) : (
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
            )}
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
