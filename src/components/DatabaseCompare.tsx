
import React from 'react';
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
import { AnalysisResult } from '@/utils/dnaUtils';
import { DNA_DATABASE } from '@/utils/dnaUtils';
import { calculateSimilarity } from '@/utils/dnaUtils';

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
  // Calculate similarity with all database entries
  const comparisons: ComparisonResult[] = DNA_DATABASE.map(plant => {
    const plantBarcode = plant.barcodes[result.barcodeRegion as keyof typeof plant.barcodes];
    const similarity = plantBarcode ? calculateSimilarity(result.sequence, plantBarcode) * 100 : 0;
    
    return {
      species: plant.species,
      commonName: plant.commonName,
      similarity,
      region: result.barcodeRegion,
      authenticity: plant.authenticity * 100
    };
  }).sort((a, b) => b.similarity - a.similarity);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-dna-blue">Database Comparison</DialogTitle>
          <DialogDescription>
            Comparing your DNA sequence with all species in our database
          </DialogDescription>
        </DialogHeader>
        
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
        
        <DialogFooter>
          <Button onClick={() => setOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DatabaseCompare;
