
import React, { useState } from 'react';
import NavBar from '@/components/NavBar';
import SequenceUploader from '@/components/SequenceUploader';
import SequenceAnalyzer from '@/components/SequenceAnalyzer';
import InfoSection from '@/components/InfoSection';
import { Dna } from 'lucide-react';

const Index = () => {
  const [dnaSequence, setDnaSequence] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleSequenceSubmit = (sequence: string) => {
    setDnaSequence(sequence);
    setIsAnalyzing(true);
    // Scroll to results section
    setTimeout(() => {
      const analyzeSection = document.getElementById('analyze');
      if (analyzeSection) {
        analyzeSection.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <NavBar />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-dna-blue to-dna-teal text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <Dna className="h-20 w-20 text-dna-green" />
              <div className="absolute inset-0 bg-white opacity-10 rounded-full animate-pulse"></div>
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">DNA Detective</h1>
          <p className="text-xl md:text-2xl max-w-3xl mx-auto mb-8 text-white/80">
            Authenticate plant species with precision using advanced DNA barcoding technology
          </p>
          <a 
            href="#analyze" 
            className="inline-block bg-dna-green text-white px-6 py-3 rounded-lg font-medium hover:bg-opacity-90 transition-colors"
          >
            Start Analyzing
          </a>
        </div>
      </section>
      
      {/* Info Section */}
      <InfoSection />
      
      {/* Analysis Section */}
      <section id="analyze" className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-dna-blue">DNA Sequence Analysis</h2>
            <p className="mt-2 text-gray-600 max-w-2xl mx-auto">
              Submit your DNA sequence to identify and authenticate plant species
            </p>
          </div>
          
          <SequenceUploader onSequenceSubmit={handleSequenceSubmit} />
          
          <SequenceAnalyzer 
            sequence={dnaSequence} 
            isAnalyzing={isAnalyzing} 
            setIsAnalyzing={setIsAnalyzing} 
          />
        </div>
      </section>
      
      {/* Footer */}
      <footer className="bg-dna-dark text-white py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <Dna className="h-6 w-6 mr-2 text-dna-green" />
              <span className="font-bold">DNA Detective</span>
            </div>
            <div className="text-sm text-gray-400">
              &copy; {new Date().getFullYear()} DNA Detective. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
