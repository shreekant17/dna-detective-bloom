import React, { useState, useEffect, useRef } from 'react';
import { Upload, FileText, CheckCircle, XCircle, ScanBarcode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { validateDNASequence } from '@/utils/dnaUtils';
import { getSampleSequences } from '@/utils/api';
import { toast } from '@/components/ui/use-toast';
import BarcodeScanner from './BarcodeScanner';

interface SequenceUploaderProps {
  onSequenceSubmit: (sequence: string) => void;
}

const SequenceUploader: React.FC<SequenceUploaderProps> = ({ onSequenceSubmit }) => {
  const [sequence, setSequence] = useState('');
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [samples, setSamples] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('manual');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchSamples = async () => {
      try {
        setIsLoading(true);
        const sampleData = await getSampleSequences();
        setSamples(sampleData);
      } catch (error) {
        console.error('Error fetching samples:', error);
        toast({
          title: 'Error',
          description: 'Failed to load sample sequences',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSamples();
  }, []);

  const handleSequenceChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newSequence = e.target.value;
    setSequence(newSequence);
    setIsValid(validateDNASequence(newSequence));
  };

  const handleSubmit = () => {
    if (isValid) {
      onSequenceSubmit(sequence);
    } else {
      toast({
        title: 'Invalid Sequence',
        description: 'Please enter a valid DNA sequence (A, T, G, C only)',
        variant: 'destructive',
      });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setSequence(content.trim());
      setIsValid(validateDNASequence(content.trim()));
    };
    reader.readAsText(file);
  };

  const handleSampleClick = (sampleSequence: string) => {
    setSequence(sampleSequence);
    setIsValid(true);
  };

  const handleBarcodeSequence = (barcodeSequence: string) => {
    setSequence(barcodeSequence);
    setIsValid(true);
    setActiveTab('manual');
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>DNA Sequence Input</CardTitle>
        <CardDescription>
          Enter a DNA sequence, upload a file, scan a barcode, or select a sample
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="manual">Manual</TabsTrigger>
            <TabsTrigger value="file">Upload</TabsTrigger>
            <TabsTrigger value="barcode">Scan</TabsTrigger>
            <TabsTrigger value="samples">Samples</TabsTrigger>
          </TabsList>

          <TabsContent value="manual">
            <div className="space-y-4">
              <Textarea
                placeholder="Enter DNA sequence (A, T, G, C only)"
                value={sequence}
                onChange={handleSequenceChange}
                className="min-h-[150px] font-mono"
              />
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  {isValid === true && <CheckCircle className="text-green-500" />}
                  {isValid === false && <XCircle className="text-red-500" />}
                  <span className="text-sm">
                    {isValid === true ? 'Valid DNA sequence' :
                      isValid === false ? 'Invalid DNA sequence' :
                        'Enter a sequence to validate'}
                  </span>
                </div>
                <Button onClick={handleSubmit} disabled={!isValid}>
                  Analyze
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="file">
            <div className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".txt,.fasta,.fa"
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="mb-2"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload File
                </Button>
                <p className="text-sm text-muted-foreground">
                  Supported formats: .txt, .fasta, .fa
                </p>
              </div>

              {sequence && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">File Content:</h3>
                  <Textarea
                    value={sequence}
                    onChange={handleSequenceChange}
                    className="min-h-[100px] font-mono text-sm"
                  />
                  <div className="flex justify-end">
                    <Button onClick={handleSubmit} disabled={!isValid}>
                      Analyze
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="barcode">
            <div className="space-y-4">
              <BarcodeScanner onSequenceFound={handleBarcodeSequence} />

              {sequence && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Scanned Sequence:</h3>
                  <Textarea
                    value={sequence}
                    onChange={handleSequenceChange}
                    className="min-h-[100px] font-mono text-sm"
                  />
                  <div className="flex justify-end">
                    <Button onClick={handleSubmit} disabled={!isValid}>
                      Analyze
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="samples">
            <div className="space-y-4">
              {isLoading ? (
                <div className="text-center py-4">Loading samples...</div>
              ) : Object.keys(samples).length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {Object.entries(samples).map(([name, sequence]) => (
                    <Button
                      key={name}
                      variant="outline"
                      className="justify-start text-left h-auto py-2"
                      onClick={() => handleSampleClick(sequence)}
                    >
                      <FileText className="mr-2 h-4 w-4 flex-shrink-0" />
                      <div>
                        <div className="font-medium">{name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {sequence.substring(0, 30)}...
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  No samples available
                </div>
              )}

              {sequence && (
                <div className="space-y-2 mt-4">
                  <h3 className="text-sm font-medium">Selected Sample:</h3>
                  <Textarea
                    value={sequence}
                    onChange={handleSequenceChange}
                    className="min-h-[100px] font-mono text-sm"
                  />
                  <div className="flex justify-end">
                    <Button onClick={handleSubmit} disabled={!isValid}>
                      Analyze
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default SequenceUploader;
