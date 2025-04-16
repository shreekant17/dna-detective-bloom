
import { AnalysisResult } from './dnaUtils';
import { toast } from '@/components/ui/use-toast';

const API_BASE_URL = 'https://shreekantkalwar-dna-backend.hf.space/api';

export const analyzeDNASequence = async (sequence: string): Promise<AnalysisResult | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sequence }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to analyze DNA sequence');
    }

    return await response.json();
  } catch (error) {
    toast({
      title: 'Analysis Error',
      description: error instanceof Error ? error.message : 'Failed to analyze DNA sequence',
      variant: 'destructive',
    });
    console.error('DNA analysis error:', error);
    return null;
  }
};

export const getSampleSequences = async (): Promise<{ [key: string]: string }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/samples`);

    if (!response.ok) {
      throw new Error('Failed to fetch sample sequences');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching sample sequences:', error);
    // Return an empty object or fallback to local samples
    return {};
  }
};
