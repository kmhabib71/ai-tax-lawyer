// Knowledge Pipeline Types

export interface DocumentMetadata {
  id: string;
  title: string;
  source_url: string;
  document_type:
    | "finance-act"
    | "income-tax-act"
    | "vat-act"
    | "customs-act"
    | "sro"
    | "circular";
  language: "bn" | "en" | "mixed";
  year?: number;
  file_size: number;
  scraped_at: Date;
  section?: string;
  tags: string[];
}

export interface ProcessedDocument {
  id: string;
  metadata: DocumentMetadata;
  original_text: string;
  normalized_text: string;
  chunks: DocumentChunk[];
  confidence_score: number;
  processing_method: "markitdown" | "tesseract" | "fetch-mcp";
  created_at: Date;
}

export interface DocumentChunk {
  id: string;
  document_id: string;
  content: string;
  content_bengali?: string;
  section_title?: string;
  chunk_index: number;
  token_count: number;
  metadata: ChunkMetadata;
}

export interface ChunkMetadata {
  section: string;
  subsection?: string;
  page_number?: number;
  contains_table: boolean;
  contains_formula: boolean;
  legal_references: string[];
  keywords: string[];
}

export interface ScrapingResult {
  documents: DocumentMetadata[];
  total_found: number;
  processed: number;
  failed: number;
  errors: string[];
}

export interface ProcessingStats {
  total_documents: number;
  successful_processing: number;
  failed_processing: number;
  total_chunks: number;
  processing_time: number;
  storage_size: number;
}

export interface NBRDocument {
  title: string;
  url: string;
  type: DocumentMetadata["document_type"];
  language: DocumentMetadata["language"];
  estimated_size: number;
  last_modified?: Date;
}

export interface PipelineOptions {
  max_concurrent_downloads: number;
  chunk_size: number;
  overlap_size: number;
  enable_ocr: boolean;
  languages: string[];
  output_directory: string;
  vector_dimensions: number;
}

export interface VectorizedDocument {
  id: string;
  chunks: VectorizedChunk[];
  metadata: DocumentMetadata;
  total_vectors: number;
}

export interface VectorizedChunk {
  id: string;
  content: string;
  embedding: number[];
  metadata: ChunkMetadata;
}

export interface BengaliProcessingResult {
  original_text: string;
  normalized_text: string;
  detected_language: string;
  confidence: number;
  sections: BengaliSection[];
}

export interface BengaliSection {
  title: string;
  content: string;
  section_number: string;
  subsections: BengaliSubsection[];
}

export interface BengaliSubsection {
  title: string;
  content: string;
  number: string;
}
