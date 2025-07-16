"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

interface ProcessedDocument {
  url: string;
  title: string;
  content: string;
  chunks: string[];
  metadata: {
    type: string;
    language: string;
    confidence: number;
    wordCount: number;
    processingTime: number;
    bengaliCharacters: number;
    englishCharacters: number;
  };
  pdfProcessing?: {
    totalPdfsFound: number;
    pdfsProcessed: number;
    successfulPdfs: number;
    failedPdfs: number;
    results: Array<{
      url: string;
      title: string;
      content: string;
      pageCount: number;
      success: boolean;
      error?: string;
    }>;
  };
  embeddings?: {
    model: string;
    totalTokens: number;
    estimatedCost: number;
  };
}

export default function TestScrapingPage() {
  const [url, setUrl] = useState(
    "https://nbr.gov.bd/regulations/acts/income-tax-acts/ban"
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedData, setProcessedData] = useState<ProcessedDocument | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const testUrls = [
    "https://nbr.gov.bd/regulations/acts/income-tax-acts/ban",
    "https://nbr.gov.bd/regulations/acts/vat-acts/ban",
    "https://nbr.gov.bd/regulations/acts/finance-acts/ban",
    "https://nbr.gov.bd/regulations/acts/customs-acts/ban",
    "https://nbr.gov.bd/regulations/sro/income-tax-sro/ban",
    "https://nbr.gov.bd/regulations/circulars/income-tax-circulars/ban",
  ];

  const handleTestUrl = async () => {
    setIsProcessing(true);
    setError(null);
    setProgress(0);

    try {
      // Simulate progress steps
      setProgress(20);

      const response = await fetch("/api/test-scraping", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });

      setProgress(60);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setProgress(100);
      setProcessedData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process URL");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">NBR Data Quality Testing</h1>
        <p className="text-gray-600">
          Test individual NBR URLs to inspect data quality before running the
          full pipeline
        </p>
      </div>

      {/* URL Input Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Test URL</CardTitle>
          <CardDescription>
            Enter an NBR URL to test data extraction and processing quality
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="url">NBR URL</Label>
              <Input
                id="url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://nbr.gov.bd/regulations/acts/income-tax-acts/ban"
                className="mt-1"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-gray-600">Quick test URLs:</span>
              {testUrls.map((testUrl) => (
                <Badge
                  key={testUrl}
                  variant="outline"
                  className="cursor-pointer hover:bg-gray-100"
                  onClick={() => setUrl(testUrl)}
                >
                  {testUrl.split("/").pop()}
                </Badge>
              ))}
            </div>

            <Button
              onClick={handleTestUrl}
              disabled={isProcessing || !url}
              className="w-full"
            >
              {isProcessing ? "Processing..." : "Test URL"}
            </Button>

            {isProcessing && (
              <div className="space-y-2">
                <Progress value={progress} className="w-full" />
                <p className="text-sm text-gray-600 text-center">
                  {progress < 30 && "Scraping website..."}
                  {progress >= 30 &&
                    progress < 70 &&
                    "Processing Bengali text..."}
                  {progress >= 70 && "Generating embeddings..."}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="mb-6 border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Results Display */}
      {processedData && (
        <Card>
          <CardHeader>
            <CardTitle>Processed Data Results</CardTitle>
            <CardDescription>
              Quality assessment for: {processedData.url}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="content">Content</TabsTrigger>
                <TabsTrigger value="chunks">Chunks</TabsTrigger>
                <TabsTrigger value="pdfs">PDFs</TabsTrigger>
                <TabsTrigger value="metadata">Metadata</TabsTrigger>
                <TabsTrigger value="embeddings">Embeddings</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-gray-50 rounded">
                    <p className="text-sm text-gray-600">Title</p>
                    <p className="font-medium truncate">
                      {processedData.title}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded">
                    <p className="text-sm text-gray-600">Type</p>
                    <Badge variant="outline">
                      {processedData.metadata.type}
                    </Badge>
                  </div>
                  <div className="p-4 bg-gray-50 rounded">
                    <p className="text-sm text-gray-600">Language</p>
                    <Badge variant="outline">
                      {processedData.metadata.language}
                    </Badge>
                  </div>
                  <div className="p-4 bg-gray-50 rounded">
                    <p className="text-sm text-gray-600">Confidence</p>
                    <Badge
                      variant={
                        processedData.metadata.confidence > 0.8
                          ? "default"
                          : "destructive"
                      }
                    >
                      {(processedData.metadata.confidence * 100).toFixed(1)}%
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-gray-50 rounded">
                    <p className="text-sm text-gray-600">Word Count</p>
                    <p className="font-medium">
                      {processedData.metadata.wordCount.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded">
                    <p className="text-sm text-gray-600">Bengali Characters</p>
                    <p className="font-medium">
                      {processedData.metadata.bengaliCharacters.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded">
                    <p className="text-sm text-gray-600">English Characters</p>
                    <p className="font-medium">
                      {processedData.metadata.englishCharacters.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded">
                    <p className="text-sm text-gray-600">Processing Time</p>
                    <p className="font-medium">
                      {processedData.metadata.processingTime.toFixed(2)}s
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="content" className="space-y-4">
                <div className="bg-gray-50 p-4 rounded max-h-96 overflow-auto">
                  <h3 className="font-medium mb-2">Extracted Content</h3>
                  <pre className="text-sm whitespace-pre-wrap">
                    {processedData.content}
                  </pre>
                </div>
              </TabsContent>

              <TabsContent value="chunks" className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-medium">
                    Document Chunks ({processedData.chunks.length})
                  </h3>
                  <div className="max-h-96 overflow-auto space-y-2">
                    {processedData.chunks.map((chunk, index) => (
                      <div key={index} className="bg-gray-50 p-3 rounded">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium">
                            Chunk {index + 1}
                          </span>
                          <span className="text-xs text-gray-500">
                            {chunk.length} chars
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">
                          {chunk.substring(0, 200)}...
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="pdfs" className="space-y-4">
                {processedData.pdfProcessing ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 bg-blue-50 rounded">
                        <p className="text-sm text-gray-600">
                          Total PDFs Found
                        </p>
                        <p className="font-medium text-lg">
                          {processedData.pdfProcessing.totalPdfsFound}
                        </p>
                      </div>
                      <div className="p-4 bg-green-50 rounded">
                        <p className="text-sm text-gray-600">
                          Successfully Processed
                        </p>
                        <p className="font-medium text-lg text-green-600">
                          {processedData.pdfProcessing.successfulPdfs}
                        </p>
                      </div>
                      <div className="p-4 bg-red-50 rounded">
                        <p className="text-sm text-gray-600">Failed</p>
                        <p className="font-medium text-lg text-red-600">
                          {processedData.pdfProcessing.failedPdfs}
                        </p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded">
                        <p className="text-sm text-gray-600">Success Rate</p>
                        <p className="font-medium text-lg">
                          {(
                            (processedData.pdfProcessing.successfulPdfs /
                              processedData.pdfProcessing.pdfsProcessed) *
                            100
                          ).toFixed(1)}
                          %
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h3 className="font-medium">PDF Processing Results</h3>
                      <div className="max-h-96 overflow-auto space-y-2">
                        {processedData.pdfProcessing.results.map(
                          (pdf, index) => (
                            <div
                              key={index}
                              className={`p-4 rounded border ${
                                pdf.success
                                  ? "border-green-200 bg-green-50"
                                  : "border-red-200 bg-red-50"
                              }`}
                            >
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <p className="font-medium truncate">
                                    {pdf.title}
                                  </p>
                                  <p className="text-sm text-gray-600 truncate">
                                    {pdf.url}
                                  </p>
                                </div>
                                <Badge
                                  variant={
                                    pdf.success ? "default" : "destructive"
                                  }
                                >
                                  {pdf.success ? "Success" : "Failed"}
                                </Badge>
                              </div>

                              {pdf.success ? (
                                <div className="space-y-2">
                                  <div className="flex gap-4 text-sm">
                                    <span>Pages: {pdf.pageCount}</span>
                                    <span>
                                      Characters:{" "}
                                      {pdf.content.length.toLocaleString()}
                                    </span>
                                  </div>
                                  <div className="bg-white p-3 rounded text-sm">
                                    <p className="font-medium mb-1">
                                      Content Preview:
                                    </p>
                                    <p className="text-gray-700">
                                      {pdf.content.substring(0, 300)}...
                                    </p>
                                  </div>
                                </div>
                              ) : (
                                <div className="bg-white p-3 rounded text-sm">
                                  <p className="font-medium mb-1 text-red-600">
                                    Error:
                                  </p>
                                  <p className="text-red-700">{pdf.error}</p>
                                </div>
                              )}
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-600">
                    No PDF processing information available
                  </p>
                )}
              </TabsContent>

              <TabsContent value="metadata" className="space-y-4">
                <div className="bg-gray-50 p-4 rounded">
                  <h3 className="font-medium mb-2">Processing Metadata</h3>
                  <pre className="text-sm">
                    {JSON.stringify(processedData.metadata, null, 2)}
                  </pre>
                </div>
              </TabsContent>

              <TabsContent value="embeddings" className="space-y-4">
                {processedData.embeddings ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-gray-50 rounded">
                      <p className="text-sm text-gray-600">Model</p>
                      <p className="font-medium">
                        {processedData.embeddings.model}
                      </p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded">
                      <p className="text-sm text-gray-600">Total Tokens</p>
                      <p className="font-medium">
                        {processedData.embeddings.totalTokens.toLocaleString()}
                      </p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded">
                      <p className="text-sm text-gray-600">Estimated Cost</p>
                      <p className="font-medium">
                        ${processedData.embeddings.estimatedCost.toFixed(4)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-600">
                    Embeddings not generated for this test
                  </p>
                )}
              </TabsContent>
            </Tabs>

            <div className="mt-6 flex gap-4">
              <Button variant="outline" onClick={() => setProcessedData(null)}>
                Test Another URL
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700"
                disabled={processedData.metadata.confidence < 0.7}
              >
                {processedData.metadata.confidence >= 0.7
                  ? "Approve for Pipeline"
                  : "Quality Too Low"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
