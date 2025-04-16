import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AnalysisResult, calculateSimilarity } from '@/utils/dnaUtils';
import { getSampleSequences } from '@/utils/api';
import { Loader2 } from 'lucide-react';

interface DatabaseCompareProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  result: AnalysisResult;
}

interface ComparisonResult {
  species: string;
  commonName: string;
  similarity: number;
  region: string;
  authenticity: number;
}

const DatabaseCompare: React.FC<DatabaseCompareProps> = ({ open, setOpen, result }) => {
  const [comparisons, setComparisons] = useState<ComparisonResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAndCompare = async () => {
      if (!open) return;

      setLoading(true);
      setError(null);

      try {
        // Fetch samples from the API
        const samples = await getSampleSequences();

        // Convert samples to comparison results
        const comparisonResults: ComparisonResult[] = Object.entries(samples).map(([commonName, sequence]) => {
          const similarity = calculateSimilarity(result.sequence, sequence) * 100;

          return {
            species: commonName, // Using commonName as species since that's what we get from the API
            commonName,
            similarity,
            region: result.barcodeRegion,
            authenticity: 100 // Default value since we don't get authenticity from the API
          };
        }).sort((a, b) => b.similarity - a.similarity);

        setComparisons(comparisonResults);
      } catch (err) {
        console.error('Error fetching comparison data:', err);
        setError('Failed to load comparison data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchAndCompare();
  }, [open, result]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-dna-blue">Database Comparison</DialogTitle>
          <DialogDescription>
            Comparing your DNA sequence with all species in our database
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-dna-blue" />
            <span className="ml-2">Loading comparison data...</span>
          </div>
        ) : error ? (
          <div className="text-red-500 py-4 text-center">{error}</div>
        ) : (
          <div className="mt-4 overflow-auto max-h-96">
            <Table>
              <TableHeader>
                <TableRow className="bg-dna-blue/10">
                  <TableHead className="font-semibold">Species</TableHead>
                  <TableHead className="font-semibold">Common Name</TableHead>
                  <TableHead className="font-semibold text-right">Match (%)</TableHead>
                  <TableHead className="font-semibold text-right">Authenticity (%)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comparisons.map((item, index) => (
                  <TableRow
                    key={index}
                    className={item.species === result.matchedSpecies ? "bg-dna-green/10" : ""}
                  >
                    <TableCell className="font-medium">
                      {item.species}
                      {item.species === result.matchedSpecies && (
                        <span className="ml-2 text-dna-green text-xs">(Best Match)</span>
                      )}
                    </TableCell>
                    <TableCell>{item.commonName}</TableCell>
                    <TableCell className="text-right">{item.similarity.toFixed(1)}</TableCell>
                    <TableCell className="text-right">{item.authenticity.toFixed(1)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <DialogFooter>
          <Button onClick={() => setOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DatabaseCompare;
