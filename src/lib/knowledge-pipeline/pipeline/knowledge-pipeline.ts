// Main Knowledge Pipeline Orchestrator
import { NBRScraper } from "../scrapers/nbr-scraper";
import { DocumentProcessor } from "../processors/document-processor";
import { VectorPreparer } from "../processors/vector-preparer";
import { PipelineConfig } from "../config/pipeline-config";
import {
  DocumentMetadata,
  ProcessedDocument,
  VectorizedDocument,
  ScrapingResult,
  ProcessingStats,
  PipelineOptions,
} from "../types";
import fs from "fs/promises";
import path from "path";

export class KnowledgePipeline {
  private scraper: NBRScraper;
  private processor: DocumentProcessor;
  private vectorPreparer: VectorPreparer;
  private stats: ProcessingStats = {
    total_documents: 0,
    successful_processing: 0,
    failed_processing: 0,
    total_chunks: 0,
    processing_time: 0,
    storage_size: 0,
  };

  constructor(
    private options: PipelineOptions = PipelineConfig.getDefaultOptions()
  ) {
    this.scraper = new NBRScraper(options);
    this.processor = new DocumentProcessor(options);
    this.vectorPreparer = new VectorPreparer(options);
  }

  /**
   * Run the complete knowledge pipeline
   */
  async runPipeline(): Promise<ProcessingStats> {
    const startTime = Date.now();

    try {
      console.log("🚀 Starting Knowledge Pipeline...");

      // Step 1: Scrape all NBR documents
      console.log("📥 Step 1: Scraping NBR documents...");
      const scrapingResult = await this.scrapeDocuments();

      // Step 2: Process documents
      console.log("🔄 Step 2: Processing documents...");
      const processedDocuments = await this.processDocuments(
        scrapingResult.documents
      );

      // Step 3: Prepare vectors
      console.log("🔢 Step 3: Preparing vectors...");
      const vectorizedDocuments = await this.vectorizeDocuments(
        processedDocuments
      );

      // Step 4: Store in vector database
      console.log("💾 Step 4: Storing in vector database...");
      await this.storeVectors(vectorizedDocuments);

      // Calculate final stats
      this.stats.processing_time = Date.now() - startTime;

      console.log("✅ Knowledge Pipeline completed successfully!");
      this.printStats();

      return this.stats;
    } catch (error) {
      console.error("❌ Knowledge Pipeline failed:", error);
      throw error;
    }
  }

  /**
   * Scrape all NBR documents
   */
  private async scrapeDocuments(): Promise<ScrapingResult> {
    const result = await this.scraper.scrapeAllDocuments();

    this.stats.total_documents = result.total_found;

    console.log(`📋 Found ${result.total_found} documents`);
    console.log(`✅ Successfully scraped ${result.processed} documents`);

    if (result.failed > 0) {
      console.warn(`⚠️  Failed to scrape ${result.failed} documents`);
      result.errors.forEach((error) => console.warn(`   - ${error}`));
    }

    return result;
  }

  /**
   * Process documents with hybrid approach
   */
  private async processDocuments(
    documents: DocumentMetadata[]
  ): Promise<ProcessedDocument[]> {
    const processedDocuments: ProcessedDocument[] = [];
    const batchSize = PipelineConfig.PERFORMANCE_CONFIG.BATCH_SIZES.PROCESSING;

    // Process in batches to avoid overwhelming the system
    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);

      console.log(
        `Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(
          documents.length / batchSize
        )}`
      );

      const batchPromises = batch.map(async (metadata) => {
        try {
          // Download document
          const buffer = await this.scraper.downloadDocument(metadata);

          // Process document
          const processed = await this.processor.processDocument(
            buffer,
            metadata
          );

          // Save processed document
          await this.processor.saveProcessedDocument(processed);

          this.stats.successful_processing++;
          this.stats.total_chunks += processed.chunks.length;

          return processed;
        } catch (error) {
          console.error(`Failed to process ${metadata.title}:`, error);
          this.stats.failed_processing++;
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      processedDocuments.push(
        ...(batchResults.filter(Boolean) as ProcessedDocument[])
      );

      // Small delay between batches
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return processedDocuments;
  }

  /**
   * Vectorize processed documents
   */
  private async vectorizeDocuments(
    documents: ProcessedDocument[]
  ): Promise<VectorizedDocument[]> {
    const vectorizedDocuments: VectorizedDocument[] = [];
    const batchSize =
      PipelineConfig.PERFORMANCE_CONFIG.BATCH_SIZES.VECTORIZATION;

    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);

      console.log(
        `Vectorizing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(
          documents.length / batchSize
        )}`
      );

      const batchPromises = batch.map(async (document) => {
        try {
          const vectorized = await this.vectorPreparer.vectorizeDocument(
            document
          );
          return vectorized;
        } catch (error) {
          console.error(
            `Failed to vectorize ${document.metadata.title}:`,
            error
          );
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      vectorizedDocuments.push(
        ...(batchResults.filter(Boolean) as VectorizedDocument[])
      );

      // Small delay between batches
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    return vectorizedDocuments;
  }

  /**
   * Store vectors in Supabase
   */
  private async storeVectors(documents: VectorizedDocument[]): Promise<void> {
    let totalStored = 0;

    for (const document of documents) {
      try {
        await this.vectorPreparer.storeInVectorDatabase(document);
        totalStored++;

        // Calculate storage size
        const documentSize = JSON.stringify(document).length;
        this.stats.storage_size += documentSize;
      } catch (error) {
        console.error(
          `Failed to store vectors for ${document.metadata.title}:`,
          error
        );
      }
    }

    console.log(`📊 Stored ${totalStored} documents in vector database`);
  }

  /**
   * Process a single document (for testing or individual processing)
   */
  async processSingleDocument(url: string): Promise<ProcessedDocument> {
    // Create metadata from URL
    const metadata: DocumentMetadata = {
      id: url,
      title: path.basename(url),
      source_url: url,
      document_type: "circular", // Default
      language: "en",
      file_size: 0,
      scraped_at: new Date(),
      tags: ["test"],
    };

    // Download and process
    const buffer = await this.scraper.downloadDocument(metadata);
    const processed = await this.processor.processDocument(buffer, metadata);

    return processed;
  }

  /**
   * Get pipeline statistics
   */
  getStats(): ProcessingStats {
    return { ...this.stats };
  }

  /**
   * Print pipeline statistics
   */
  private printStats(): void {
    const stats = this.stats;
    const processingTimeMinutes = Math.round(stats.processing_time / 60000);
    const storageSizeMB = Math.round(stats.storage_size / (1024 * 1024));

    console.log("\n📊 Pipeline Statistics:");
    console.log(`   Total Documents: ${stats.total_documents}`);
    console.log(`   Successfully Processed: ${stats.successful_processing}`);
    console.log(`   Failed Processing: ${stats.failed_processing}`);
    console.log(`   Total Chunks: ${stats.total_chunks}`);
    console.log(`   Processing Time: ${processingTimeMinutes} minutes`);
    console.log(`   Storage Size: ${storageSizeMB} MB`);
    console.log(
      `   Success Rate: ${(
        (stats.successful_processing / stats.total_documents) *
        100
      ).toFixed(1)}%`
    );
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    await this.scraper.cleanup();
    console.log("🧹 Cleanup completed");
  }

  /**
   * Resume pipeline from a specific step
   */
  async resumePipeline(
    fromStep: "scraping" | "processing" | "vectorizing" | "storing"
  ): Promise<ProcessingStats> {
    console.log(`🔄 Resuming pipeline from ${fromStep} step...`);

    const processedDir = this.options.output_directory;

    switch (fromStep) {
      case "processing":
        // Load scraped documents and continue processing
        const scrapedDocuments = await this.loadScrapedDocuments();
        const processedDocuments = await this.processDocuments(
          scrapedDocuments
        );
        const vectorizedDocuments = await this.vectorizeDocuments(
          processedDocuments
        );
        await this.storeVectors(vectorizedDocuments);
        break;

      case "vectorizing":
        // Load processed documents and continue vectorizing
        const processed = await this.loadProcessedDocuments();
        const vectorized = await this.vectorizeDocuments(processed);
        await this.storeVectors(vectorized);
        break;

      case "storing":
        // Load vectorized documents and store
        const vectorizedDocs = await this.loadVectorizedDocuments();
        await this.storeVectors(vectorizedDocs);
        break;

      default:
        return this.runPipeline();
    }

    return this.stats;
  }

  /**
   * Load scraped documents from cache
   */
  private async loadScrapedDocuments(): Promise<DocumentMetadata[]> {
    const cacheDir = PipelineConfig.STORAGE_CONFIG.CACHE_DIR;
    const cacheFile = path.join(cacheDir, "scraped_documents.json");

    try {
      const data = await fs.readFile(cacheFile, "utf8");
      return JSON.parse(data);
    } catch (error) {
      console.error("Failed to load scraped documents from cache:", error);
      return [];
    }
  }

  /**
   * Load processed documents from storage
   */
  private async loadProcessedDocuments(): Promise<ProcessedDocument[]> {
    const processedDir = this.options.output_directory;
    const files = await fs.readdir(processedDir);
    const processedDocuments: ProcessedDocument[] = [];

    for (const file of files) {
      if (file.endsWith(".json")) {
        try {
          const data = await fs.readFile(path.join(processedDir, file), "utf8");
          const document = JSON.parse(data);
          processedDocuments.push(document);
        } catch (error) {
          console.error(`Failed to load processed document ${file}:`, error);
        }
      }
    }

    return processedDocuments;
  }

  /**
   * Load vectorized documents from storage
   */
  private async loadVectorizedDocuments(): Promise<VectorizedDocument[]> {
    // This would load from a vectorized documents cache
    // For now, we'll return empty array
    return [];
  }

  /**
   * Create a quick test of the pipeline
   */
  async testPipeline(): Promise<void> {
    console.log("🧪 Running pipeline test...");

    try {
      // Test scraping a few documents
      const scraper = new NBRScraper(this.options);
      await scraper.initialize();

      // Test processing
      const processor = new DocumentProcessor(this.options);

      // Test vectorization
      const vectorPreparer = new VectorPreparer(this.options);

      console.log("✅ Pipeline test completed successfully!");
    } catch (error) {
      console.error("❌ Pipeline test failed:", error);
      throw error;
    }
  }
}
