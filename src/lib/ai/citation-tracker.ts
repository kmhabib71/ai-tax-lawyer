/**
 * Citation Tracker - AI Tax Lawyer Bangladesh
 * Track and manage citations for all legal sources in RAG responses
 */

export interface LegalSource {
  id: string;
  document_type: 'finance_act' | 'income_tax_act' | 'vat_act' | 'sro' | 'circular';
  document_name: string;
  section?: string;
  subsection?: string;
  clause?: string;
  page_number?: number;
  chunk_id: string;
  content_excerpt: string;
  relevance_score: number;
  date_issued?: string;
  authority: string; // NBR, Ministry of Finance, etc.
  language: 'bn' | 'en' | 'mixed';
}

export interface Citation {
  id: string;
  source: LegalSource;
  query: string;
  response_section: string;
  confidence_score: number;
  timestamp: Date;
  user_id?: string;
}

export class CitationTracker {
  private citations: Map<string, Citation[]> = new Map();
  
  constructor() {
    // Initialize with empty citations
  }

  /**
   * Create a citation from RAG search results
   */
  createCitation(
    source: LegalSource,
    query: string,
    responseSection: string,
    confidenceScore: number,
    userId?: string
  ): Citation {
    const citation: Citation = {
      id: `cite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      source,
      query,
      response_section: responseSection,
      confidence_score: confidenceScore,
      timestamp: new Date(),
      user_id: userId
    };

    // Store citation
    const key = userId || 'anonymous';
    if (!this.citations.has(key)) {
      this.citations.set(key, []);
    }
    this.citations.get(key)!.push(citation);

    return citation;
  }

  /**
   * Convert Supabase search results to legal sources
   */
  convertSearchResultsToSources(searchResults: any[]): LegalSource[] {
    return searchResults.map((result, index) => {
      const metadata = result.metadata || {};
      
      return {
        id: `source_${result.id}`,
        document_type: this.normalizeDocumentType(result.document_type || metadata.document_type),
        document_name: result.document_name || metadata.document_name || 'Unknown Document',
        section: this.extractSection(result.content),
        chunk_id: result.id,
        content_excerpt: this.createExcerpt(result.content),
        relevance_score: result.similarity || 0,
        page_number: metadata.page_number,
        date_issued: metadata.date_issued,
        authority: this.determineAuthority(result.document_type),
        language: result.language || metadata.language || 'bn'
      };
    });
  }

  /**
   * Format citations for display in responses
   */
  formatCitationsForResponse(citations: Citation[]): string {
    if (citations.length === 0) return '';

    const citationList = citations.map((cite, index) => {
      const source = cite.source;
      const docName = this.translateDocumentName(source.document_name, source.language);
      const section = source.section ? `, ${source.section}` : '';
      const authority = source.authority;
      
      return `[${index + 1}] ${docName}${section} - ${authority} (${(cite.confidence_score * 100).toFixed(0)}% relevance)`;
    }).join('\n');

    return `\n\n**আইনী উৎস (Legal Sources):**\n${citationList}`;
  }

  /**
   * Format citations for Bengali responses
   */
  formatCitationsForBengali(citations: Citation[]): string {
    if (citations.length === 0) return '';

    const citationList = citations.map((cite, index) => {
      const source = cite.source;
      const docName = this.translateDocumentName(source.document_name, 'bn');
      const section = source.section ? `, ${source.section}` : '';
      
      return `[${index + 1}] ${docName}${section} - জাতীয় রাজস্ব বোর্ড (${(cite.confidence_score * 100).toFixed(0)}% প্রাসঙ্গিকতা)`;
    }).join('\n');

    return `\n\n**তথ্যসূত্র:**\n${citationList}`;
  }

  /**
   * Generate legal disclaimer with citations
   */
  generateLegalDisclaimer(citations: Citation[], language: 'bn' | 'en' = 'bn'): string {
    const hasHighConfidence = citations.some(c => c.confidence_score > 0.8);
    const citationCount = citations.length;

    if (language === 'bn') {
      return `\n\n**আইনী দাবিত্যাগ:** এই তথ্য ${citationCount}টি সরকারী উৎস থেকে সংগৃহীত। ${hasHighConfidence ? 'উচ্চ নির্ভরযোগ্যতা।' : 'অতিরিক্ত যাচাই প্রয়োজন।'} গুরুত্বপূর্ণ সিদ্ধান্তের জন্য অনুগ্রহ করে কর বিশেষজ্ঞের সাথে পরামর্শ করুন।`;
    } else {
      return `\n\n**Legal Disclaimer:** This information is derived from ${citationCount} official sources. ${hasHighConfidence ? 'High confidence.' : 'Additional verification recommended.'} Please consult a tax professional for important decisions.`;
    }
  }

  /**
   * Create audit trail for citations
   */
  createAuditTrail(citations: Citation[]): any {
    return {
      timestamp: new Date().toISOString(),
      citation_count: citations.length,
      sources: citations.map(c => ({
        document: c.source.document_name,
        type: c.source.document_type,
        confidence: c.confidence_score,
        query: c.query,
        chunk_id: c.source.chunk_id
      })),
      avg_confidence: citations.reduce((sum, c) => sum + c.confidence_score, 0) / citations.length,
      languages: [...new Set(citations.map(c => c.source.language))]
    };
  }

  /**
   * Get citations for a user session
   */
  getUserCitations(userId: string): Citation[] {
    return this.citations.get(userId) || [];
  }

  /**
   * Clear citations for a user
   */
  clearUserCitations(userId: string): void {
    this.citations.delete(userId);
  }

  // Private helper methods

  private normalizeDocumentType(type: string): LegalSource['document_type'] {
    const normalizedType = type?.toLowerCase() || '';
    
    if (normalizedType.includes('finance')) return 'finance_act';
    if (normalizedType.includes('income') || normalizedType.includes('tax')) return 'income_tax_act';
    if (normalizedType.includes('vat') || normalizedType.includes('value')) return 'vat_act';
    if (normalizedType.includes('sro')) return 'sro';
    if (normalizedType.includes('circular')) return 'circular';
    
    return 'finance_act'; // Default fallback
  }

  private extractSection(content: string): string | undefined {
    // Bengali section patterns
    const bengaliSectionMatch = content.match(/(ধারা\s*[\u09E6-\u09EF\d]+|অনুচ্ছেদ\s*[\u09E6-\u09EF\d]+|খণ্ড\s*[\u09E6-\u09EF\d]+)/);
    if (bengaliSectionMatch) {
      return bengaliSectionMatch[1];
    }

    // English section patterns
    const englishSectionMatch = content.match(/(Section\s*\d+|Chapter\s*\d+|Part\s*[IVX\d]+)/i);
    if (englishSectionMatch) {
      return englishSectionMatch[1];
    }

    return undefined;
  }

  private createExcerpt(content: string, maxLength: number = 150): string {
    if (!content) return '';
    
    // Clean up content
    const cleaned = content
      .replace(/\s+/g, ' ')
      .replace(/[^\u0980-\u09FF\u0020-\u007E\s]/g, '')
      .trim();
    
    if (cleaned.length <= maxLength) {
      return cleaned;
    }
    
    // Try to cut at sentence boundary
    const sentences = cleaned.split(/[।.!?]/);
    let excerpt = '';
    
    for (const sentence of sentences) {
      if ((excerpt + sentence).length <= maxLength) {
        excerpt += sentence + '। ';
      } else {
        break;
      }
    }
    
    return excerpt.trim() || cleaned.substring(0, maxLength) + '...';
  }

  private determineAuthority(documentType: string): string {
    const type = documentType?.toLowerCase() || '';
    
    if (type.includes('finance') || type.includes('income') || type.includes('vat')) {
      return 'জাতীয় রাজস্ব বোর্ড (NBR)';
    }
    if (type.includes('sro')) {
      return 'জাতীয় রাজস্ব বোর্ড (NBR)';
    }
    if (type.includes('circular')) {
      return 'জাতীয় রাজস্ব বোর্ড (NBR)';
    }
    
    return 'বাংলাদেশ সরকার';
  }

  private translateDocumentName(name: string, language: string): string {
    if (!name) return 'Unknown Document';
    
    const translations: Record<string, { bn: string; en: string }> = {
      'finance-act-2025-bangla.pdf': {
        bn: 'অর্থ আইন ২০২৫',
        en: 'Finance Act 2025'
      },
      'Income_Tax_act-2023-bangla.pdf': {
        bn: 'আয়কর আইন ২০২৩',
        en: 'Income Tax Act 2023'
      },
      'vat-act-2012-bangla.pdf': {
        bn: 'মূল্য সংযোজন কর আইন ২০১২',
        en: 'VAT Act 2012'
      }
    };

    const translation = translations[name];
    if (translation) {
      return language === 'bn' ? translation.bn : translation.en;
    }

    // Fallback: clean up filename
    return name
      .replace(/\.pdf$/i, '')
      .replace(/-/g, ' ')
      .replace(/bangla/gi, '')
      .trim();
  }
}

// Export singleton instance
export const citationTracker = new CitationTracker();