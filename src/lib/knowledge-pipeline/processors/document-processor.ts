// Hybrid Document Processor
import { ProcessedDocument, DocumentMetadata, DocumentChunk } from "../types";
import { PipelineConfig } from "../config/pipeline-config";
import { BengaliTextHandler } from "./bengali-text-handler";
import { createHash } from "crypto";
import fs from "fs/promises";
import path from "path";

export class DocumentProcessor {
  private bengaliHandler = new BengaliTextHandler();
  private processingConfig = PipelineConfig.PROCESSING_CONFIG;

  constructor(private options = PipelineConfig.getDefaultOptions()) {}

  /**
   * Process a document using hybrid approach
   */
  async processDocument(
    buffer: Buffer,
    metadata: DocumentMetadata
  ): Promise<ProcessedDocument> {
    const startTime = Date.now();

    // Try different processing methods in order of preference
    const methods = this.processingConfig.PROCESSING_METHODS;
    let result: ProcessedDocument | null = null;
    let lastError: Error | null = null;

    for (const method of methods) {
      try {
        console.log(`Trying ${method} for document ${metadata.title}`);

        switch (method) {
          case "markitdown":
            result = await this.processWithMarkItDown(buffer, metadata);
            break;
          case "tesseract":
            result = await this.processWithTesseract(buffer, metadata);
            break;
          case "fetch-mcp":
            result = await this.processWithFetchMCP(buffer, metadata);
            break;
        }

        // Check if result meets confidence threshold
        if (
          result &&
          result.confidence_score >=
            this.processingConfig.CONFIDENCE_THRESHOLDS.MIN_ACCEPTABLE
        ) {
          console.log(
            `Successfully processed with ${method}, confidence: ${result.confidence_score}`
          );
          result.processing_method = method as any;
          break;
        }
      } catch (error) {
        console.error(`Method ${method} failed:`, error);
        lastError = error instanceof Error ? error : new Error(String(error));
        continue;
      }
    }

    if (!result) {
      throw new Error(
        `All processing methods failed. Last error: ${lastError?.message}`
      );
    }

    // Post-process the result
    result = await this.postProcessDocument(result);

    // Calculate final processing time
    const processingTime = Date.now() - startTime;
    console.log(
      `Document processed in ${processingTime}ms using ${result.processing_method}`
    );

    return result;
  }

  /**
   * Process document using Microsoft MarkItDown
   */
  private async processWithMarkItDown(
    buffer: Buffer,
    metadata: DocumentMetadata
  ): Promise<ProcessedDocument> {
    try {
      // Since we can't import MarkItDown directly due to dependencies,
      // we'll simulate the process using a text extraction approach
      const text = await this.extractTextFromPDF(buffer);

      if (!text || text.length < 50) {
        throw new Error("MarkItDown: Insufficient text extracted");
      }

      const processedText = await this.bengaliHandler.processBengaliText(text);
      const chunks = await this.chunkDocument(
        processedText.normalized_text,
        metadata
      );

      return {
        id: metadata.id,
        metadata,
        original_text: text,
        normalized_text: processedText.normalized_text,
        chunks,
        confidence_score: this.calculateConfidence(
          text,
          metadata,
          "markitdown"
        ),
        processing_method: "markitdown",
        created_at: new Date(),
      };
    } catch (error) {
      throw new Error(
        `MarkItDown processing failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Process document using Tesseract OCR
   */
  private async processWithTesseract(
    buffer: Buffer,
    metadata: DocumentMetadata
  ): Promise<ProcessedDocument> {
    try {
      // Simulate Tesseract processing for Bengali + English
      const text = await this.simulateTesseractOCR(buffer, metadata);

      if (!text || text.length < 30) {
        throw new Error("Tesseract: Insufficient text extracted");
      }

      const processedText = await this.bengaliHandler.processBengaliText(text);
      const chunks = await this.chunkDocument(
        processedText.normalized_text,
        metadata
      );

      return {
        id: metadata.id,
        metadata,
        original_text: text,
        normalized_text: processedText.normalized_text,
        chunks,
        confidence_score: this.calculateConfidence(text, metadata, "tesseract"),
        processing_method: "tesseract",
        created_at: new Date(),
      };
    } catch (error) {
      throw new Error(
        `Tesseract processing failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Process document using Fetch MCP (for web content)
   */
  private async processWithFetchMCP(
    buffer: Buffer,
    metadata: DocumentMetadata
  ): Promise<ProcessedDocument> {
    try {
      // This would be used for web-based content
      const text = await this.extractTextFromPDF(buffer);

      if (!text || text.length < 50) {
        throw new Error("Fetch MCP: Insufficient text extracted");
      }

      const processedText = await this.bengaliHandler.processBengaliText(text);
      const chunks = await this.chunkDocument(
        processedText.normalized_text,
        metadata
      );

      return {
        id: metadata.id,
        metadata,
        original_text: text,
        normalized_text: processedText.normalized_text,
        chunks,
        confidence_score: this.calculateConfidence(text, metadata, "fetch-mcp"),
        processing_method: "fetch-mcp",
        created_at: new Date(),
      };
    } catch (error) {
      throw new Error(
        `Fetch MCP processing failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Extract text from PDF buffer (simplified implementation)
   */
  private async extractTextFromPDF(buffer: Buffer): Promise<string> {
    // This is a simplified implementation
    // In real implementation, you would use pdf-parse or similar
    const text = buffer.toString("utf8");

    // Clean up the text
    return text
      .replace(/[^\u0000-\u007F\u0980-\u09FF]/g, " ") // Keep ASCII and Bengali
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Simulate Tesseract OCR processing
   */
  private async simulateTesseractOCR(
    buffer: Buffer,
    metadata: DocumentMetadata
  ): Promise<string> {
    // This would use actual Tesseract.js in real implementation
    // For now, we'll simulate OCR with text extraction
    const text = await this.extractTextFromPDF(buffer);

    // Simulate OCR confidence scoring
    const ocrConfidence = this.simulateOCRConfidence(text, metadata);

    if (ocrConfidence < 0.5) {
      throw new Error("OCR confidence too low");
    }

    return text;
  }

  /**
   * Simulate OCR confidence scoring
   */
  private simulateOCRConfidence(
    text: string,
    metadata: DocumentMetadata
  ): number {
    let confidence = 0.7; // Base OCR confidence

    // Boost for Bengali documents
    if (metadata.language === "bn") {
      const bengaliChars = text.match(/[\u0980-\u09FF]/g) || [];
      if (bengaliChars.length > 0) {
        confidence += 0.1;
      }
    }

    // Boost for structured documents
    if (text.includes("ধারা") || text.includes("section")) {
      confidence += 0.1;
    }

    // Reduce for short documents
    if (text.length < 100) {
      confidence -= 0.2;
    }

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Calculate confidence score based on processing method and content
   */
  private calculateConfidence(
    text: string,
    metadata: DocumentMetadata,
    method: string
  ): number {
    let confidence = 0.5; // Base confidence

    // Method-specific confidence
    switch (method) {
      case "markitdown":
        confidence = 0.9; // High confidence for structured extraction
        break;
      case "tesseract":
        confidence = 0.7; // Medium confidence for OCR
        break;
      case "fetch-mcp":
        confidence = 0.8; // Good confidence for web content
        break;
    }

    // Content quality factors
    const textValidation = this.bengaliHandler.validateTextQuality(text);
    confidence *= textValidation.score;

    // Document type factors
    const docConfig = PipelineConfig.getProcessingConfig(
      metadata.document_type
    );
    if (docConfig.priority <= 2) {
      confidence += 0.1; // Boost for important document types
    }

    // Language detection confidence
    if (metadata.language === "bn" && text.match(/[\u0980-\u09FF]/g)) {
      confidence += 0.05;
    }

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Chunk document into smaller pieces for vector storage
   */
  private async chunkDocument(
    text: string,
    metadata: DocumentMetadata
  ): Promise<DocumentChunk[]> {
    const config = PipelineConfig.getProcessingConfig(metadata.document_type);
    const chunkSize = config.chunk_size;
    const overlapSize = config.overlap_size;

    const chunks: DocumentChunk[] = [];
    const lines = text.split("\n");

    let currentChunk = "";
    let currentLines: string[] = [];
    let chunkIndex = 0;

    for (const line of lines) {
      const testChunk = currentChunk + (currentChunk ? "\n" : "") + line;

      if (testChunk.length > chunkSize && currentChunk) {
        // Create chunk
        const chunk = await this.createChunk(
          currentChunk,
          metadata,
          chunkIndex,
          currentLines
        );
        chunks.push(chunk);

        // Start new chunk with overlap
        const overlapLines = currentLines.slice(-Math.floor(overlapSize / 50));
        currentChunk = overlapLines.join("\n");
        currentLines = [...overlapLines];
        chunkIndex++;
      }

      currentChunk = testChunk;
      currentLines.push(line);
    }

    // Add final chunk
    if (currentChunk.trim()) {
      const chunk = await this.createChunk(
        currentChunk,
        metadata,
        chunkIndex,
        currentLines
      );
      chunks.push(chunk);
    }

    return chunks;
  }

  /**
   * Create a document chunk with metadata
   */
  private async createChunk(
    content: string,
    metadata: DocumentMetadata,
    chunkIndex: number,
    lines: string[]
  ): Promise<DocumentChunk> {
    const chunkId = createHash("md5")
      .update(`${metadata.id}-${chunkIndex}`)
      .digest("hex");

    // Extract section information
    const sectionTitle = this.extractSectionTitle(lines);
    const keywords = this.bengaliHandler.extractKeywords(content);

    // Detect content features
    const containsTable = this.detectTable(content);
    const containsFormula = this.detectFormula(content);
    const legalReferences = this.extractLegalReferences(content);

    return {
      id: chunkId,
      document_id: metadata.id,
      content: content.trim(),
      content_bengali: metadata.language === "bn" ? content.trim() : undefined,
      section_title: sectionTitle,
      chunk_index: chunkIndex,
      token_count: this.estimateTokenCount(content),
      metadata: {
        section: sectionTitle || "unknown",
        contains_table: containsTable,
        contains_formula: containsFormula,
        legal_references: legalReferences,
        keywords,
      },
    };
  }

  /**
   * Extract section title from lines
   */
  private extractSectionTitle(lines: string[]): string | undefined {
    for (const line of lines) {
      const trimmedLine = line.trim();

      // Check for section headers
      if (trimmedLine.match(/^(ধারা|Section|অধ্যায়|Chapter)\s*[০-৯0-9]+/)) {
        return trimmedLine;
      }

      // Check for subsection headers
      if (trimmedLine.match(/^(উপধারা|Subsection)\s*\([০-৯0-9]+\)/)) {
        return trimmedLine;
      }
    }

    return undefined;
  }

  /**
   * Detect if content contains tables
   */
  private detectTable(content: string): boolean {
    return (
      content.includes("|") ||
      content.includes("┌") ||
      content.includes("─") ||
      content.match(/\s+\|\s+/g) !== null
    );
  }

  /**
   * Detect if content contains formulas
   */
  private detectFormula(content: string): boolean {
    return (
      content.includes("=") ||
      content.includes("%") ||
      content.includes("×") ||
      content.includes("÷") ||
      content.match(/\d+\s*[+\-×÷]\s*\d+/g) !== null
    );
  }

  /**
   * Extract legal references from content
   */
  private extractLegalReferences(content: string): string[] {
    const references: string[] = [];

    // Section references
    const sectionRefs = content.match(/ধারা\s*[০-৯0-9]+/g) || [];
    references.push(...sectionRefs);

    // Subsection references
    const subsectionRefs = content.match(/উপধারা\s*\([০-৯0-9]+\)/g) || [];
    references.push(...subsectionRefs);

    // Act references
    const actRefs = content.match(/[০-৯0-9]+\s*সালের\s*আইন/g) || [];
    references.push(...actRefs);

    return [...new Set(references)];
  }

  /**
   * Estimate token count for chunk
   */
  private estimateTokenCount(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters for Bengali/English mixed text
    return Math.ceil(text.length / 4);
  }

  /**
   * Post-process document after initial processing
   */
  private async postProcessDocument(
    document: ProcessedDocument
  ): Promise<ProcessedDocument> {
    // Validate all chunks
    for (const chunk of document.chunks) {
      const validation = this.bengaliHandler.validateTextQuality(chunk.content);
      if (!validation.isValid) {
        console.warn(
          `Chunk ${chunk.id} has quality issues:`,
          validation.issues
        );
      }
    }

    // Update confidence based on chunk quality
    const avgChunkQuality =
      document.chunks.reduce((sum, chunk) => {
        const quality = this.bengaliHandler.validateTextQuality(chunk.content);
        return sum + quality.score;
      }, 0) / document.chunks.length;

    document.confidence_score = Math.min(
      document.confidence_score,
      avgChunkQuality
    );

    return document;
  }

  /**
   * Save processed document to file system
   */
  async saveProcessedDocument(document: ProcessedDocument): Promise<void> {
    const outputDir = this.options.output_directory;
    await fs.mkdir(outputDir, { recursive: true });

    const filename = `${document.metadata.document_type}_${
      document.metadata.year || "unknown"
    }_${document.id}.json`;
    const filepath = path.join(outputDir, filename);

    await fs.writeFile(filepath, JSON.stringify(document, null, 2));
    console.log(`Saved processed document to ${filepath}`);
  }
}
