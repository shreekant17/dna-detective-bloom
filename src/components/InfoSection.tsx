
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Database, TestTube, Dna, Microscope, PieChart, BookOpen } from 'lucide-react';

const InfoSection: React.FC = () => {
  return (
    <section id="about" className="py-12 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-dna-blue">About DNA Detective</h2>
          <p className="mt-2 text-gray-600 max-w-2xl mx-auto">
            Leveraging DNA barcoding technology to authenticate plant species with precision and reliability
          </p>
        </div>

        <Tabs defaultValue="overview" className="max-w-4xl mx-auto">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-8">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="technology">Technology</TabsTrigger>
            <TabsTrigger value="applications">Applications</TabsTrigger>
            <TabsTrigger value="process">Process</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-dna-blue">
                  <BookOpen className="mr-2 h-5 w-5" />
                  What is DNA Barcoding?
                </CardTitle>
                <CardDescription>
                  Understanding the science behind plant authentication
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  DNA barcoding is a taxonomic method that uses a short genetic marker in an organism's DNA to identify
                  it as belonging to a particular species. Just as a supermarket scanner uses the black stripes of the
                  Universal Product Code to identify items in your shopping cart, a DNA barcode is used to identify species.
                </p>
                <p>
                  For plants, several DNA regions have been proposed as potential barcodes, including portions of
                  <span className="font-semibold"> rbcL</span>, <span className="font-semibold">matK</span>, and
                  <span className="font-semibold"> ITS</span> (Internal Transcribed Spacer). These regions provide a reliable
                  and accurate method to distinguish between closely related plant species.
                </p>
                <p>
                  DNA Detective uses these barcode regions to authenticate plant materials, helping researchers,
                  companies, and consumers ensure the authenticity of botanical products.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="technology">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-dna-blue">
                  <Microscope className="mr-2 h-5 w-5" />
                  Our Technology
                </CardTitle>
                <CardDescription>
                  Advanced techniques for DNA sequence analysis
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <h4 className="font-medium text-dna-teal">Barcode Regions</h4>
                    <p className="text-sm text-gray-600">
                      We analyze key regions including ITS, rbcL, and matK to provide comprehensive authentication of plant species.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium text-dna-teal">Sequence Alignment</h4>
                    <p className="text-sm text-gray-600">
                      Our algorithms align and compare DNA sequences to identify similarities and differences with precision.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium text-dna-teal">Reference Database</h4>
                    <p className="text-sm text-gray-600">
                      We maintain a curated database of authenticated reference sequences for reliable species identification.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium text-dna-teal">Expert Validation</h4>
                    <p className="text-sm text-gray-600">
                      Our team of specialists reviews sequence matches to ensure high-confidence species identification through manual verification.
                    </p>
                  </div>
                </div>
              </CardContent>

            </Card>
          </TabsContent>

          <TabsContent value="applications">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-dna-blue">
                  <TestTube className="mr-2 h-5 w-5" />
                  Real-World Applications
                </CardTitle>
                <CardDescription>
                  How DNA Detective is used across industries
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                    <h4 className="font-medium text-dna-teal mb-2">Botanical Research</h4>
                    <p className="text-sm text-gray-600">
                      Enabling researchers to accurately identify plant species for taxonomic studies and biodiversity assessments.
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                    <h4 className="font-medium text-dna-teal mb-2">Pharmaceutical</h4>
                    <p className="text-sm text-gray-600">
                      Ensuring the authenticity of medicinal plants used in drug development and herbal medicines.
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                    <h4 className="font-medium text-dna-teal mb-2">Food & Supplements</h4>
                    <p className="text-sm text-gray-600">
                      Verifying ingredients in food products and dietary supplements to prevent adulteration.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="process">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-dna-blue">
                  <PieChart className="mr-2 h-5 w-5" />
                  How It Works
                </CardTitle>
                <CardDescription>
                  The DNA authentication process
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 bg-dna-teal text-white rounded-full w-8 h-8 flex items-center justify-center mr-3">
                      1
                    </div>
                    <div>
                      <h4 className="font-medium">Sample Input</h4>
                      <p className="text-sm text-gray-600">
                        Submit your DNA sequence through our interface or upload a FASTA file.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="flex-shrink-0 bg-dna-teal text-white rounded-full w-8 h-8 flex items-center justify-center mr-3">
                      2
                    </div>
                    <div>
                      <h4 className="font-medium">Barcode Identification</h4>
                      <p className="text-sm text-gray-600">
                        Our system identifies which barcode region the sequence belongs to.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="flex-shrink-0 bg-dna-teal text-white rounded-full w-8 h-8 flex items-center justify-center mr-3">
                      3
                    </div>
                    <div>
                      <h4 className="font-medium">Database Comparison</h4>
                      <p className="text-sm text-gray-600">
                        The sequence is compared against our authenticated reference database.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="flex-shrink-0 bg-dna-teal text-white rounded-full w-8 h-8 flex items-center justify-center mr-3">
                      4
                    </div>
                    <div>
                      <h4 className="font-medium">Results Analysis</h4>
                      <p className="text-sm text-gray-600">
                        We calculate match percentages, similarity scores, and confidence intervals.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="flex-shrink-0 bg-dna-teal text-white rounded-full w-8 h-8 flex items-center justify-center mr-3">
                      5
                    </div>
                    <div>
                      <h4 className="font-medium">Authentication Report</h4>
                      <p className="text-sm text-gray-600">
                        Receive a detailed report on the species identification and authenticity metrics.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
};

export default InfoSection;
