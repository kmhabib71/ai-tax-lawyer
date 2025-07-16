#!/usr/bin/env node

// CLI Script to Run Knowledge Pipeline
import { KnowledgePipeline } from "../pipeline/knowledge-pipeline";
import { PipelineConfig } from "../config/pipeline-config";
import { Command } from "commander";
import fs from "fs/promises";
import path from "path";

const program = new Command();

program
  .name("nbr-knowledge-pipeline")
  .description("AI Tax Lawyer Bangladesh - NBR Knowledge Pipeline")
  .version("1.0.0");

program
  .command("run")
  .description("Run the complete knowledge pipeline")
  .option(
    "-o, --output <path>",
    "Output directory for processed documents",
    "./processed/documents"
  )
  .option("-c, --concurrent <number>", "Max concurrent downloads", "5")
  .option("--chunk-size <number>", "Chunk size for document processing", "1500")
  .option("--enable-ocr", "Enable OCR for scanned documents", false)
  .option(
    "--languages <languages>",
    "Languages to process (comma-separated)",
    "bn,en"
  )
  .action(async (options) => {
    try {
      console.log("🚀 Starting NBR Knowledge Pipeline...");
      console.log("📁 Output directory:", options.output);
      console.log("🔄 Max concurrent downloads:", options.concurrent);
      console.log("📝 Chunk size:", options.chunkSize);
      console.log("🔍 OCR enabled:", options.enableOcr);
      console.log("🌐 Languages:", options.languages);

      // Create output directory
      await fs.mkdir(options.output, { recursive: true });

      // Configure pipeline options
      const pipelineOptions = {
        ...PipelineConfig.getDefaultOptions(),
        output_directory: options.output,
        max_concurrent_downloads: parseInt(options.concurrent),
        chunk_size: parseInt(options.chunkSize),
        enable_ocr: options.enableOcr,
        languages: options.languages.split(","),
      };

      // Run pipeline
      const pipeline = new KnowledgePipeline(pipelineOptions);
      const stats = await pipeline.runPipeline();

      console.log("\n📊 Final Statistics:");
      console.log(`   📄 Total Documents: ${stats.total_documents}`);
      console.log(
        `   ✅ Successfully Processed: ${stats.successful_processing}`
      );
      console.log(`   ❌ Failed: ${stats.failed_processing}`);
      console.log(`   🧩 Total Chunks: ${stats.total_chunks}`);
      console.log(
        `   ⏱️  Processing Time: ${Math.round(
          stats.processing_time / 60000
        )} minutes`
      );
      console.log(
        `   💾 Storage Size: ${Math.round(
          stats.storage_size / (1024 * 1024)
        )} MB`
      );

      await pipeline.cleanup();
    } catch (error) {
      console.error("❌ Pipeline failed:", error);
      process.exit(1);
    }
  });

program
  .command("scrape")
  .description("Only scrape documents without processing")
  .option(
    "-o, --output <path>",
    "Output directory for scraped metadata",
    "./cache/scraped"
  )
  .action(async (options) => {
    try {
      console.log("📥 Starting document scraping...");

      const { NBRScraper } = await import("../scrapers/nbr-scraper");
      const scraper = new NBRScraper();

      const result = await scraper.scrapeAllDocuments();

      // Save scraped metadata
      await fs.mkdir(options.output, { recursive: true });
      const outputFile = path.join(options.output, "scraped_documents.json");
      await fs.writeFile(outputFile, JSON.stringify(result, null, 2));

      console.log(`✅ Scraped ${result.total_found} documents`);
      console.log(`📄 Metadata saved to: ${outputFile}`);

      await scraper.cleanup();
    } catch (error) {
      console.error("❌ Scraping failed:", error);
      process.exit(1);
    }
  });

program
  .command("process")
  .description("Process previously scraped documents")
  .option(
    "-i, --input <path>",
    "Input file with scraped metadata",
    "./cache/scraped/scraped_documents.json"
  )
  .option(
    "-o, --output <path>",
    "Output directory for processed documents",
    "./processed/documents"
  )
  .option(
    "--method <method>",
    "Processing method (markitdown, tesseract, fetch-mcp)",
    "markitdown"
  )
  .action(async (options) => {
    try {
      console.log("🔄 Starting document processing...");

      // Load scraped metadata
      const data = await fs.readFile(options.input, "utf8");
      const scrapingResult = JSON.parse(data);

      const { DocumentProcessor } = await import(
        "../processors/document-processor"
      );
      const { NBRScraper } = await import("../scrapers/nbr-scraper");

      const processor = new DocumentProcessor();
      const scraper = new NBRScraper();

      let processed = 0;
      let failed = 0;

      for (const document of scrapingResult.documents) {
        try {
          console.log(`Processing: ${document.title}`);

          // Download document
          const buffer = await scraper.downloadDocument(document);

          // Process document
          const processedDoc = await processor.processDocument(
            buffer,
            document
          );

          // Save processed document
          await processor.saveProcessedDocument(processedDoc);

          processed++;
        } catch (error) {
          console.error(`Failed to process ${document.title}:`, error);
          failed++;
        }
      }

      console.log(`✅ Processed ${processed} documents`);
      console.log(`❌ Failed ${failed} documents`);

      await scraper.cleanup();
    } catch (error) {
      console.error("❌ Processing failed:", error);
      process.exit(1);
    }
  });

program
  .command("vectorize")
  .description("Create vectors from processed documents")
  .option(
    "-i, --input <path>",
    "Input directory with processed documents",
    "./processed/documents"
  )
  .option("--batch-size <number>", "Batch size for vectorization", "20")
  .action(async (options) => {
    try {
      console.log("🔢 Starting vectorization...");

      const { VectorPreparer } = await import("../processors/vector-preparer");
      const vectorPreparer = new VectorPreparer();

      // Load processed documents
      const files = await fs.readdir(options.input);
      const processedDocuments = [];

      for (const file of files) {
        if (file.endsWith(".json")) {
          const data = await fs.readFile(
            path.join(options.input, file),
            "utf8"
          );
          const doc = JSON.parse(data);
          processedDocuments.push(doc);
        }
      }

      console.log(`📄 Found ${processedDocuments.length} processed documents`);

      // Vectorize documents
      let vectorized = 0;
      const batchSize = parseInt(options.batchSize);

      for (let i = 0; i < processedDocuments.length; i += batchSize) {
        const batch = processedDocuments.slice(i, i + batchSize);

        for (const doc of batch) {
          try {
            const vectorizedDoc = await vectorPreparer.vectorizeDocument(doc);
            await vectorPreparer.storeInVectorDatabase(vectorizedDoc);
            vectorized++;
          } catch (error) {
            console.error(`Failed to vectorize ${doc.metadata.title}:`, error);
          }
        }

        console.log(
          `✅ Vectorized ${Math.min(
            i + batchSize,
            processedDocuments.length
          )}/${processedDocuments.length} documents`
        );
      }

      console.log(
        `🎉 Vectorization complete! ${vectorized} documents vectorized`
      );
    } catch (error) {
      console.error("❌ Vectorization failed:", error);
      process.exit(1);
    }
  });

program
  .command("stats")
  .description("Show vector database statistics")
  .action(async () => {
    try {
      console.log("📊 Fetching vector database statistics...");

      const { VectorPreparer } = await import("../processors/vector-preparer");
      const vectorPreparer = new VectorPreparer();

      const stats = await vectorPreparer.getVectorDatabaseStats();

      console.log("\n📈 Vector Database Statistics:");
      console.log(`   📄 Total Documents: ${stats.total_documents}`);
      console.log(`   🧩 Total Chunks: ${stats.total_chunks}`);
      console.log(
        `   💾 Storage Size: ${Math.round(
          stats.storage_size / (1024 * 1024)
        )} MB`
      );

      console.log("\n🌐 Languages:");
      Object.entries(stats.languages).forEach(([lang, count]) => {
        console.log(`   ${lang}: ${count} documents`);
      });

      console.log("\n📑 Document Types:");
      Object.entries(stats.document_types).forEach(([type, count]) => {
        console.log(`   ${type}: ${count} documents`);
      });
    } catch (error) {
      console.error("❌ Failed to fetch statistics:", error);
      process.exit(1);
    }
  });

program
  .command("test")
  .description("Test the pipeline with a single document")
  .option("-u, --url <url>", "URL of document to test")
  .action(async (options) => {
    try {
      if (!options.url) {
        console.error("❌ Please provide a document URL with --url");
        process.exit(1);
      }

      console.log("🧪 Testing pipeline with single document...");
      console.log("📄 Document URL:", options.url);

      const pipeline = new KnowledgePipeline();
      const processed = await pipeline.processSingleDocument(options.url);

      console.log("✅ Test completed successfully!");
      console.log(`📊 Processed document: ${processed.metadata.title}`);
      console.log(`🧩 Generated ${processed.chunks.length} chunks`);
      console.log(
        `🎯 Confidence score: ${processed.confidence_score.toFixed(2)}`
      );
      console.log(`⚙️  Processing method: ${processed.processing_method}`);

      await pipeline.cleanup();
    } catch (error) {
      console.error("❌ Test failed:", error);
      process.exit(1);
    }
  });

program
  .command("cleanup")
  .description("Clean up vector database")
  .action(async () => {
    try {
      console.log("🧹 Starting vector database cleanup...");

      const { VectorPreparer } = await import("../processors/vector-preparer");
      const vectorPreparer = new VectorPreparer();

      await vectorPreparer.cleanupVectorDatabase();

      console.log("✅ Cleanup completed successfully!");
    } catch (error) {
      console.error("❌ Cleanup failed:", error);
      process.exit(1);
    }
  });

program
  .command("check")
  .description("Check system requirements and configuration")
  .action(async () => {
    try {
      console.log("🔍 Checking system requirements...");

      // Check environment variables
      const requiredEnvVars = [
        "OPENAI_API_KEY",
        "NEXT_PUBLIC_SUPABASE_URL",
        "SUPABASE_SERVICE_ROLE_KEY",
      ];

      const missingVars = requiredEnvVars.filter(
        (varName) => !process.env[varName]
      );

      if (missingVars.length > 0) {
        console.error("❌ Missing environment variables:");
        missingVars.forEach((varName) => {
          console.error(`   - ${varName}`);
        });
        process.exit(1);
      }

      console.log("✅ Environment variables configured");

      // Test vector database connection
      const { VectorPreparer } = await import("../processors/vector-preparer");
      const vectorPreparer = new VectorPreparer();

      const connectionOk = await vectorPreparer.testConnection();

      if (!connectionOk) {
        console.error("❌ Vector database connection failed");
        process.exit(1);
      }

      console.log("✅ Vector database connection successful");

      // Check directories
      const directories = [
        "./temp/knowledge-pipeline",
        "./processed/documents",
        "./cache/nbr-scraper",
      ];

      for (const dir of directories) {
        try {
          await fs.mkdir(dir, { recursive: true });
          console.log(`✅ Directory ready: ${dir}`);
        } catch (error) {
          console.error(`❌ Failed to create directory ${dir}:`, error);
        }
      }

      console.log("🎉 System check completed successfully!");
    } catch (error) {
      console.error("❌ System check failed:", error);
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse();
