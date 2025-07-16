// Knowledge Pipeline Configuration
import { PipelineOptions } from "../types";

export class PipelineConfig {
  // NBR Website URLs
  static readonly NBR_URLS = {
    FINANCE_ACTS: "https://nbr.gov.bd/regulations/acts/finance-acts/ban",
    INCOME_TAX_ACTS: "https://nbr.gov.bd/regulations/acts/income-tax-acts/ban",
    VAT_ACTS: "https://nbr.gov.bd/regulations/acts/vat-acts/ban",
    CUSTOMS_ACTS: "https://nbr.gov.bd/regulations/acts/customs-acts/ban",
    SRO_CIRCULARS: "https://nbr.gov.bd/regulations/sro",
    CIRCULARS: "https://nbr.gov.bd/regulations/circulars",
  };

  // Document Type Mapping
  static readonly DOCUMENT_TYPES = {
    "finance-act": {
      url_pattern: /finance-act/i,
      keywords: ["finance", "budget", "fiscal", "অর্থ", "বাজেট"],
      priority: 1,
    },
    "income-tax-act": {
      url_pattern: /income-tax/i,
      keywords: ["income", "tax", "আয়কর", "কর"],
      priority: 1,
    },
    "vat-act": {
      url_pattern: /vat/i,
      keywords: ["vat", "value added", "মূসক"],
      priority: 2,
    },
    "customs-act": {
      url_pattern: /customs/i,
      keywords: ["customs", "duty", "শুল্ক"],
      priority: 2,
    },
    sro: {
      url_pattern: /sro/i,
      keywords: ["sro", "statutory", "নিয়মাবলী"],
      priority: 3,
    },
    circular: {
      url_pattern: /circular/i,
      keywords: ["circular", "notice", "বিজ্ঞপ্তি"],
      priority: 3,
    },
  };

  // Processing Configuration
  static readonly PROCESSING_CONFIG = {
    // Chunk sizes for different document types
    CHUNK_SIZES: {
      "finance-act": 2000,
      "income-tax-act": 1500,
      "vat-act": 1500,
      "customs-act": 1500,
      sro: 1000,
      circular: 800,
    },

    // Overlap sizes for context preservation
    OVERLAP_SIZES: {
      "finance-act": 200,
      "income-tax-act": 150,
      "vat-act": 150,
      "customs-act": 150,
      sro: 100,
      circular: 80,
    },

    // OCR languages
    OCR_LANGUAGES: ["ben", "eng"],

    // Processing methods priority
    PROCESSING_METHODS: ["markitdown", "tesseract", "fetch-mcp"],

    // Confidence thresholds
    CONFIDENCE_THRESHOLDS: {
      MIN_ACCEPTABLE: 0.6,
      GOOD_QUALITY: 0.8,
      EXCELLENT_QUALITY: 0.95,
    },
  };

  // Bengali Text Processing
  static readonly BENGALI_CONFIG = {
    // Unicode normalization
    UNICODE_NORMALIZATION: "NFKC",

    // Section number mapping
    SECTION_MAPPINGS: {
      "৮২(সি)": "82C",
      "৮২(খ)": "82B",
      "৮২(গ)": "82C",
      "৮০(ক)": "80A",
      "৮০(খ)": "80B",
      "৮০(গ)": "80C",
    },

    // Common synonyms
    SYNONYMS: {
      আয়: ["income", "earning"],
      কর: ["tax", "duty"],
      ভাড়া: ["rent", "rental"],
      বেতন: ["salary", "wage"],
      ব্যবসা: ["business", "trade"],
      সম্পদ: ["asset", "property"],
      রিটার্ন: ["return", "filing"],
      ছাড়: ["exemption", "deduction"],
      সুবিধা: ["benefit", "advantage"],
      জরিমানা: ["penalty", "fine"],
    },

    // Legal terms
    LEGAL_TERMS: {
      আইন: "act",
      বিধি: "rule",
      আদেশ: "order",
      নিয়মাবলী: "regulation",
      প্রবিধান: "regulation",
      বিজ্ঞপ্তি: "notification",
      সংশোধনী: "amendment",
      ধারা: "section",
      উপধারা: "subsection",
      অনুচ্ছেদ: "clause",
    },
  };

  // Storage Configuration
  static readonly STORAGE_CONFIG = {
    // Local storage paths
    TEMP_DIR: "./temp/knowledge-pipeline",
    PROCESSED_DIR: "./processed/documents",
    CACHE_DIR: "./cache/nbr-scraper",

    // File naming conventions
    FILENAME_PATTERNS: {
      PDF: "{type}_{year}_{title_slug}.pdf",
      MARKDOWN: "{type}_{year}_{title_slug}.md",
      CHUNKS: "{type}_{year}_{title_slug}_chunks.json",
      VECTORS: "{type}_{year}_{title_slug}_vectors.json",
    },

    // Supabase configuration
    SUPABASE_TABLES: {
      DOCUMENTS: "documents",
      CHUNKS: "document_chunks",
      VECTORS: "document_vectors",
      METADATA: "document_metadata",
    },
  };

  // Rate limiting and performance
  static readonly PERFORMANCE_CONFIG = {
    MAX_CONCURRENT_DOWNLOADS: 5,
    DOWNLOAD_TIMEOUT: 30000, // 30 seconds
    PROCESSING_TIMEOUT: 60000, // 1 minute
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000, // 1 second

    // Batch sizes
    BATCH_SIZES: {
      SCRAPING: 10,
      PROCESSING: 5,
      VECTORIZATION: 20,
    },
  };

  // Enhanced NBR URLs for comprehensive document collection
  static readonly NBR_COMPREHENSIVE_URLS = {
    // Original Task 1.1 URLs (keep these)
    BASE_URL: "https://nbr.gov.bd",
    INCOME_TAX_ORDINANCE: "https://nbr.gov.bd/income-tax-ordinance-1984",
    FINANCE_ACTS: "https://nbr.gov.bd/finance-acts",
    CIRCULARS: "https://nbr.gov.bd/circulars",
    SRO: "https://nbr.gov.bd/sros",
    DTAA: "https://nbr.gov.bd/dtaa",
    VAT_ACT: "https://nbr.gov.bd/vat-act-1991",

    // EXPANDED: Comprehensive NBR document collection
    COMPREHENSIVE_SECTIONS: {
      // Rules and Regulations
      REGULATIONS: {
        BASE: "https://nbr.gov.bd/regulations",
        ACTS: "https://nbr.gov.bd/regulations/acts",
        INCOME_TAX_ACTS:
          "https://nbr.gov.bd/regulations/acts/income-tax-acts/ban",
        FINANCE_ACTS: "https://nbr.gov.bd/regulations/acts/finance-acts",
        VAT_ACTS: "https://nbr.gov.bd/regulations/acts/vat-acts",
        CUSTOMS_ACTS: "https://nbr.gov.bd/regulations/acts/customs-acts",
        ADMINISTRATIVE_ACTS:
          "https://nbr.gov.bd/regulations/acts/administrative-acts",
        OTHER_ADMIN_ACTS:
          "https://nbr.gov.bd/regulations/acts/other-administrative-acts",
      },

      // Rules (বিধিমালা)
      RULES: {
        BASE: "https://nbr.gov.bd/regulations/rules",
        INCOME_TAX_RULES:
          "https://nbr.gov.bd/regulations/rules/income-tax-rules",
        VAT_RULES: "https://nbr.gov.bd/regulations/rules/vat-rules",
        CUSTOMS_RULES: "https://nbr.gov.bd/regulations/rules/customs-rules",
      },

      // SROs (এসআরও)
      SRO_COMPREHENSIVE: {
        BASE: "https://nbr.gov.bd/regulations/sro",
        INCOME_TAX_SRO: "https://nbr.gov.bd/regulations/sro/income-tax-sro",
        VAT_SRO: "https://nbr.gov.bd/regulations/sro/vat-sro",
        CUSTOMS_SRO: "https://nbr.gov.bd/regulations/sro/customs-sro",
      },

      // Circulars (সার্কুলার আদেশ)
      CIRCULARS_COMPREHENSIVE: {
        BASE: "https://nbr.gov.bd/regulations/circulars",
        INCOME_TAX_CIRCULARS:
          "https://nbr.gov.bd/regulations/circulars/income-tax-circulars",
        VAT_CIRCULARS: "https://nbr.gov.bd/regulations/circulars/vat-circulars",
        CUSTOMS_CIRCULARS:
          "https://nbr.gov.bd/regulations/circulars/customs-circulars",
      },

      // Policies (নীতিমালা)
      POLICIES: {
        BASE: "https://nbr.gov.bd/policies",
        TAX_POLICIES: "https://nbr.gov.bd/policies/tax-policies",
        ADMINISTRATIVE_POLICIES:
          "https://nbr.gov.bd/policies/administrative-policies",
      },

      // International Agreements
      INTERNATIONAL: {
        DTAA: "https://nbr.gov.bd/international/dtaa",
        WTO_AGREEMENTS: "https://nbr.gov.bd/international/wto",
        BILATERAL_AGREEMENTS: "https://nbr.gov.bd/international/bilateral",
      },
    },
  };

  // Document type classification for comprehensive collection
  static readonly COMPREHENSIVE_DOCUMENT_TYPES = {
    // Original types
    INCOME_TAX_ORDINANCE: "income_tax_ordinance",
    FINANCE_ACT: "finance_act",
    CIRCULAR: "circular",
    SRO: "sro",
    DTAA: "dtaa",
    VAT_ACT: "vat_act",

    // Extended types
    CUSTOMS_ACT: "customs_act",
    ADMINISTRATIVE_ACT: "administrative_act",
    RULES: "rules",
    POLICY: "policy",
    INTERNATIONAL_AGREEMENT: "international_agreement",
    NOTIFICATION: "notification",
    ORDER: "order",
    GUIDELINE: "guideline",
  };

  // Enhanced processing configuration
  static readonly COMPREHENSIVE_PROCESSING_CONFIG = {
    // Increase limits for comprehensive collection
    MAX_CONCURRENT_REQUESTS: 3, // Reduced to avoid overloading NBR server
    REQUEST_DELAY: 2000, // 2 seconds between requests
    MAX_RETRIES: 5,
    TIMEOUT: 60000, // 60 seconds for large documents

    // Enhanced chunking for larger document set
    CHUNK_SIZE: 1000, // Smaller chunks for better precision
    CHUNK_OVERLAP: 200,

    // Storage projections for comprehensive collection
    ESTIMATED_DOCUMENTS: 3000,
    ESTIMATED_CHUNKS: 50000,
    ESTIMATED_STORAGE_GB: 10,
  };

  // Get default pipeline options
  static getDefaultOptions(): PipelineOptions {
    return {
      max_concurrent_downloads:
        this.PERFORMANCE_CONFIG.MAX_CONCURRENT_DOWNLOADS,
      chunk_size: 1500,
      overlap_size: 150,
      enable_ocr: true,
      languages: ["ben", "eng"],
      output_directory: this.STORAGE_CONFIG.PROCESSED_DIR,
      vector_dimensions: 1536, // OpenAI embedding dimensions
    };
  }

  // Get processing config for document type
  static getProcessingConfig(documentType: string) {
    const validType =
      documentType as keyof typeof this.PROCESSING_CONFIG.CHUNK_SIZES;
    const validDocType = documentType as keyof typeof this.DOCUMENT_TYPES;

    return {
      chunk_size: this.PROCESSING_CONFIG.CHUNK_SIZES[validType] || 1500,
      overlap_size: this.PROCESSING_CONFIG.OVERLAP_SIZES[validType] || 150,
      priority: this.DOCUMENT_TYPES[validDocType]?.priority || 5,
    };
  }

  // URL patterns for document detection
  static getUrlPatterns() {
    return Object.entries(this.DOCUMENT_TYPES).map(([type, config]) => ({
      type,
      pattern: config.url_pattern,
      keywords: config.keywords,
    }));
  }
}
