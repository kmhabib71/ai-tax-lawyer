// Bengali Text Processing and Normalization
import { BengaliProcessingResult, BengaliSection } from "../types";
import { PipelineConfig } from "../config/pipeline-config";

export class BengaliTextHandler {
  private bengaliConfig = PipelineConfig.BENGALI_CONFIG;

  /**
   * Process Bengali text with normalization and structure extraction
   */
  async processBengaliText(text: string): Promise<BengaliProcessingResult> {
    const normalizedText = this.normalizeText(text);
    const detectedLanguage = this.detectLanguage(text);
    const confidence = this.calculateConfidence(text);
    const sections = this.extractSections(normalizedText);

    return {
      original_text: text,
      normalized_text: normalizedText,
      detected_language: detectedLanguage,
      confidence,
      sections,
    };
  }

  /**
   * Normalize Bengali text with Unicode and formatting fixes
   */
  private normalizeText(text: string): string {
    let normalized = text;

    // Unicode normalization
    normalized = normalized.normalize(this.bengaliConfig.UNICODE_NORMALIZATION);

    // Fix common Bengali text issues
    normalized = this.fixBengaliFormatting(normalized);

    // Convert Bengali numerals to English in section references
    normalized = this.convertSectionNumbers(normalized);

    // Clean up whitespace
    normalized = normalized.replace(/\s+/g, " ").trim();

    // Remove invisible characters
    normalized = normalized.replace(/[\u200B-\u200D\uFEFF]/g, "");

    return normalized;
  }

  /**
   * Fix common Bengali formatting issues
   */
  private fixBengaliFormatting(text: string): string {
    let fixed = text;

    // Fix mixed Bengali-English spacing
    fixed = fixed.replace(/([a-zA-Z])([অ-৯])/g, "$1 $2");
    fixed = fixed.replace(/([অ-৯])([a-zA-Z])/g, "$1 $2");

    // Fix punctuation spacing
    fixed = fixed.replace(/([।!?])([অ-৯a-zA-Z])/g, "$1 $2");
    fixed = fixed.replace(/([অ-৯a-zA-Z])([।!?])/g, "$1$2");

    // Fix bracket spacing
    fixed = fixed.replace(/\s*\(\s*/g, " (");
    fixed = fixed.replace(/\s*\)\s*/g, ") ");

    // Fix colon spacing
    fixed = fixed.replace(/\s*:\s*/g, ": ");

    return fixed;
  }

  /**
   * Convert Bengali section numbers to English equivalents
   */
  private convertSectionNumbers(text: string): string {
    let converted = text;

    // Convert specific section patterns
    for (const [bengali, english] of Object.entries(
      this.bengaliConfig.SECTION_MAPPINGS
    )) {
      converted = converted.replace(new RegExp(bengali, "g"), english);
    }

    // Convert Bengali numerals in section references
    converted = converted.replace(/ধারা\s*([০-৯]+)/g, (match, num) => {
      const englishNum = this.convertBengaliToEnglishNumber(num);
      return `ধারা ${englishNum}`;
    });

    // Convert subsection references
    converted = converted.replace(/উপধারা\s*\(([০-৯]+)\)/g, (match, num) => {
      const englishNum = this.convertBengaliToEnglishNumber(num);
      return `উপধারা (${englishNum})`;
    });

    return converted;
  }

  /**
   * Convert Bengali numerals to English
   */
  private convertBengaliToEnglishNumber(bengaliNumber: string): string {
    const bengaliToEnglish: { [key: string]: string } = {
      "০": "0",
      "১": "1",
      "২": "2",
      "৩": "3",
      "৪": "4",
      "৫": "5",
      "৬": "6",
      "৭": "7",
      "৮": "8",
      "৯": "9",
    };

    return bengaliNumber.replace(/[০-৯]/g, (match) => bengaliToEnglish[match]);
  }

  /**
   * Detect language composition
   */
  private detectLanguage(text: string): string {
    const bengaliChars = text.match(/[\u0980-\u09FF]/g) || [];
    const englishChars = text.match(/[a-zA-Z]/g) || [];
    const totalChars = text.length;

    const bengaliRatio = bengaliChars.length / totalChars;
    const englishRatio = englishChars.length / totalChars;

    if (bengaliRatio > 0.6) return "bengali";
    if (englishRatio > 0.6) return "english";
    if (bengaliRatio > 0.2 && englishRatio > 0.2) return "mixed";

    return "unknown";
  }

  /**
   * Calculate confidence score for text processing
   */
  private calculateConfidence(text: string): number {
    let confidence = 0.5; // Base confidence

    // Boost confidence for structured text
    if (text.includes("ধারা") || text.includes("উপধারা")) confidence += 0.2;
    if (text.includes("আইন") || text.includes("বিধি")) confidence += 0.15;
    if (text.includes("সংশোধনী") || text.includes("প্রবিধান"))
      confidence += 0.1;

    // Boost for legal formatting
    if (text.match(/\([০-৯]+\)/)) confidence += 0.1;
    if (text.match(/[০-৯]+\./)) confidence += 0.1;

    // Reduce confidence for very short text
    if (text.length < 100) confidence -= 0.2;

    // Reduce confidence for poor formatting
    if (text.includes("???") || text.includes("���")) confidence -= 0.3;

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Extract structured sections from Bengali text
   */
  private extractSections(text: string): BengaliSection[] {
    const sections: BengaliSection[] = [];

    // Split by common section markers
    const sectionMarkers = [
      /ধারা\s*([০-৯]+)/g,
      /অধ্যায়\s*([০-৯]+)/g,
      /পরিচ্ছেদ\s*([০-৯]+)/g,
      /ভাগ\s*([০-৯]+)/g,
    ];

    let currentSection: BengaliSection | null = null;
    const lines = text.split("\n");

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      // Check if this is a section header
      let isSectionHeader = false;
      for (const marker of sectionMarkers) {
        const match = trimmedLine.match(marker);
        if (match) {
          // Save previous section
          if (currentSection) {
            sections.push(currentSection);
          }

          // Start new section
          currentSection = {
            title: trimmedLine,
            content: "",
            section_number: this.convertBengaliToEnglishNumber(match[1]),
            subsections: [],
          };
          isSectionHeader = true;
          break;
        }
      }

      if (!isSectionHeader) {
        // Check for subsections
        const subsectionMatch = trimmedLine.match(/উপধারা\s*\(([০-৯]+)\)/);
        if (subsectionMatch && currentSection) {
          currentSection.subsections.push({
            title: trimmedLine,
            content: "",
            number: this.convertBengaliToEnglishNumber(subsectionMatch[1]),
          });
        } else if (currentSection) {
          // Add to current section content
          currentSection.content +=
            (currentSection.content ? "\n" : "") + trimmedLine;
        }
      }
    }

    // Add final section
    if (currentSection) {
      sections.push(currentSection);
    }

    return sections;
  }

  /**
   * Create synonyms and variants for search
   */
  createSearchVariants(text: string): string[] {
    const variants: string[] = [text];

    // Add synonyms from config
    for (const [bengali, englishSynonyms] of Object.entries(
      this.bengaliConfig.SYNONYMS
    )) {
      if (text.includes(bengali)) {
        for (const synonym of englishSynonyms) {
          variants.push(text.replace(bengali, synonym));
        }
      }
    }

    // Add legal term variants
    for (const [bengali, english] of Object.entries(
      this.bengaliConfig.LEGAL_TERMS
    )) {
      if (text.includes(bengali)) {
        variants.push(text.replace(bengali, english));
      }
    }

    return [...new Set(variants)]; // Remove duplicates
  }

  /**
   * Extract keywords from Bengali text
   */
  extractKeywords(text: string): string[] {
    const keywords: string[] = [];

    // Tax-related keywords
    const taxKeywords = [
      "আয়কর",
      "কর",
      "ভাড়া",
      "বেতন",
      "ব্যবসা",
      "সম্পদ",
      "রিটার্ন",
      "ছাড়",
      "সুবিধা",
      "জরিমানা",
    ];

    // Legal keywords
    const legalKeywords = [
      "আইন",
      "বিধি",
      "আদেশ",
      "নিয়মাবলী",
      "প্রবিধান",
      "বিজ্ঞপ্তি",
      "সংশোধনী",
      "ধারা",
      "উপধারা",
      "অনুচ্ছেদ",
    ];

    // Find tax keywords
    for (const keyword of taxKeywords) {
      if (text.includes(keyword)) {
        keywords.push(keyword);
      }
    }

    // Find legal keywords
    for (const keyword of legalKeywords) {
      if (text.includes(keyword)) {
        keywords.push(keyword);
      }
    }

    // Extract section numbers
    const sectionMatches = text.match(/ধারা\s*([০-৯]+)/g) || [];
    for (const match of sectionMatches) {
      keywords.push(match);
    }

    return [...new Set(keywords)]; // Remove duplicates
  }

  /**
   * Validate Bengali text quality
   */
  validateTextQuality(text: string): {
    isValid: boolean;
    issues: string[];
    score: number;
  } {
    const issues: string[] = [];
    let score = 1.0;

    // Check for encoding issues
    if (text.includes("???") || text.includes("���")) {
      issues.push("Encoding issues detected");
      score -= 0.4;
    }

    // Check for proper Bengali characters
    const bengaliChars = text.match(/[\u0980-\u09FF]/g) || [];
    if (bengaliChars.length === 0 && text.length > 0) {
      issues.push("No Bengali characters found");
      score -= 0.3;
    }

    // Check for excessive whitespace
    if (text.match(/\s{5,}/)) {
      issues.push("Excessive whitespace detected");
      score -= 0.1;
    }

    // Check for proper sentence structure
    if (text.length > 100 && !text.includes("।") && !text.includes(".")) {
      issues.push("No proper sentence endings found");
      score -= 0.2;
    }

    return {
      isValid: score > 0.5,
      issues,
      score: Math.max(0, score),
    };
  }
}
