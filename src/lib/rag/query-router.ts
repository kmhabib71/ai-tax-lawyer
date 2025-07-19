/**
 * Intelligent Query Router - AI Tax Lawyer Bangladesh
 * Routes queries to appropriate search system (MongoDB structured vs Supabase semantic)
 */

interface QueryAnalysis {
  route: 'structured' | 'semantic' | 'hybrid';
  confidence: number;
  reasoning: string;
  keywords: string[];
  hsCodeDetected?: string;
}

interface StructuredSearchResult {
  hsCode: string;
  description: string;
  dutyPercent: number;
  sourceAct: string;
  confidence: number;
}

interface SemanticSearchResult {
  content: string;
  sourceDocument: string;
  section?: string;
  language: string;
  similarity: number;
}

interface HybridSearchResult {
  structured: StructuredSearchResult[];
  semantic: SemanticSearchResult[];
  route: string;
  totalResults: number;
}

export class QueryRouter {
  private structuredKeywords = [
    // English
    'hs code', 'duty rate', 'tax rate', 'tariff', 'customs duty', 'import duty',
    'percentage', '%', 'rate', 'code', 'classification',
    
    // Bengali - duty/tax related
    'শুল্ক', 'শুল্কের হার', 'কাস্টমস', 'আমদানি শুল্ক', 'সম্পূরক শুল্ক',
    'হার', 'শতকরা', 'এইচএস কোড', 'এইচ.এস.', 'কোড',
    'ভ্যাট', 'মূল্য সংযোজন কর', 'ট্যাক্স',
    
    // Specific product searches
    'কত', 'কত শতাংশ', 'কত টাকা', 'কত পারসেন্ট'
  ];

  private semanticKeywords = [
    // English
    'rule', 'regulation', 'law', 'provision', 'section', 'clause',
    'procedure', 'process', 'exemption', 'how to', 'when', 'why',
    'definition', 'meaning', 'explanation', 'guide',
    
    // Bengali - legal/procedural terms  
    'নিয়ম', 'বিধান', 'আইন', 'ধারা', 'অনুচ্ছেদ', 'পদ্ধতি',
    'প্রক্রিয়া', 'কিভাবে', 'কীভাবে', 'কেন', 'কখন', 'কি',
    'ছাড়', 'অব্যাহতি', 'নিবন্ধন', 'লাইসেন্স', 'পারমিট',
    'সংজ্ঞা', 'অর্থ', 'ব্যাখ্যা', 'গাইড'
  ];

  private hsCodePattern = /\b\d{4}\.?\d{2}\.?\d{2}\b/g;

  /**
   * Analyze query and determine routing strategy
   */
  analyzeQuery(query: string): QueryAnalysis {
    const normalizedQuery = query.toLowerCase().trim();
    
    // Check for HS code patterns
    const hsCodeMatches = query.match(this.hsCodePattern);
    const hsCodeDetected = hsCodeMatches ? hsCodeMatches[0] : undefined;
    
    // Count keyword matches
    const structuredMatches = this.structuredKeywords.filter(keyword =>
      normalizedQuery.includes(keyword.toLowerCase())
    );
    
    const semanticMatches = this.semanticKeywords.filter(keyword =>
      normalizedQuery.includes(keyword.toLowerCase())
    );
    
    // Calculate scores
    const structuredScore = structuredMatches.length + (hsCodeDetected ? 3 : 0);
    const semanticScore = semanticMatches.length;
    
    // Determine route
    let route: 'structured' | 'semantic' | 'hybrid';
    let confidence: number;
    let reasoning: string;
    
    if (hsCodeDetected) {
      route = 'structured';
      confidence = 0.95;
      reasoning = `HS Code detected: ${hsCodeDetected}`;
    } else if (structuredScore > semanticScore * 1.5) {
      route = 'structured';
      confidence = Math.min(0.9, 0.6 + (structuredScore * 0.1));
      reasoning = `Strong structured indicators: ${structuredMatches.join(', ')}`;
    } else if (semanticScore > structuredScore * 1.5) {
      route = 'semantic';
      confidence = Math.min(0.9, 0.6 + (semanticScore * 0.1));
      reasoning = `Strong semantic indicators: ${semanticMatches.join(', ')}`;
    } else if (structuredScore > 0 && semanticScore > 0) {
      route = 'hybrid';
      confidence = 0.7;
      reasoning = `Mixed indicators - using hybrid search`;
    } else {
      // Default to semantic for general queries
      route = 'semantic';
      confidence = 0.5;
      reasoning = `No strong indicators - defaulting to semantic search`;
    }
    
    return {
      route,
      confidence,
      reasoning,
      keywords: [...structuredMatches, ...semanticMatches],
      hsCodeDetected
    };
  }

  /**
   * Search structured tax records in MongoDB
   */
  async searchStructured(query: string, hsCode?: string): Promise<StructuredSearchResult[]> {
    try {
      const response = await fetch('/api/tax-records/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query,
          hsCode,
          limit: 10
        })
      });
      
      if (!response.ok) {
        throw new Error(`Structured search failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.results || [];
      
    } catch (error) {
      console.error('Structured search error:', error);
      return [];
    }
  }

  /**
   * Search document chunks in Supabase Vector DB
   */
  async searchSemantic(query: string): Promise<SemanticSearchResult[]> {
    try {
      const response = await fetch('/api/documents/semantic-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query,
          limit: 5,
          threshold: 0.7
        })
      });
      
      if (!response.ok) {
        throw new Error(`Semantic search failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.results || [];
      
    } catch (error) {
      console.error('Semantic search error:', error);
      return [];
    }
  }

  /**
   * Execute intelligent search based on query analysis
   */
  async intelligentSearch(query: string): Promise<HybridSearchResult> {
    const analysis = this.analyzeQuery(query);
    
    console.log('Query Analysis:', analysis);
    
    let structured: StructuredSearchResult[] = [];
    let semantic: SemanticSearchResult[] = [];
    
    try {
      if (analysis.route === 'structured') {
        structured = await this.searchStructured(query, analysis.hsCodeDetected);
      } else if (analysis.route === 'semantic') {
        semantic = await this.searchSemantic(query);
      } else if (analysis.route === 'hybrid') {
        // Execute both searches in parallel
        const [structuredResults, semanticResults] = await Promise.all([
          this.searchStructured(query, analysis.hsCodeDetected),
          this.searchSemantic(query)
        ]);
        structured = structuredResults;
        semantic = semanticResults;
      }
    } catch (error) {
      console.error('Search execution error:', error);
    }
    
    return {
      structured,
      semantic,
      route: analysis.route,
      totalResults: structured.length + semantic.length
    };
  }

  /**
   * Format results for AI response generation
   */
  formatResultsForAI(results: HybridSearchResult, query: string): string {
    const { structured, semantic, route } = results;
    
    let formattedResults = `Search Route: ${route}\n\n`;
    
    // Add structured results
    if (structured.length > 0) {
      formattedResults += "STRUCTURED TAX DATA:\n";
      structured.forEach((result, index) => {
        formattedResults += `${index + 1}. HS Code: ${result.hsCode}\n`;
        formattedResults += `   Description: ${result.description}\n`;
        formattedResults += `   Duty Rate: ${result.dutyPercent}%\n`;
        formattedResults += `   Source: ${result.sourceAct}\n\n`;
      });
    }
    
    // Add semantic results
    if (semantic.length > 0) {
      formattedResults += "LEGAL CONTEXT:\n";
      semantic.forEach((result, index) => {
        formattedResults += `${index + 1}. Source: ${result.sourceDocument}\n`;
        if (result.section) {
          formattedResults += `   Section: ${result.section}\n`;
        }
        formattedResults += `   Content: ${result.content.substring(0, 200)}...\n`;
        formattedResults += `   Relevance: ${(result.similarity * 100).toFixed(1)}%\n\n`;
      });
    }
    
    if (structured.length === 0 && semantic.length === 0) {
      formattedResults += "No relevant results found in the tax database.\n";
    }
    
    return formattedResults;
  }

  /**
   * Extract product names for better search
   */
  extractProductNames(query: string): string[] {
    // Common Bengali product terms
    const bengaliProducts = [
      'চিনি', 'লবণ', 'চাল', 'ডাল', 'তেল', 'পানীয়', 'সিগারেট', 'তামাক',
      'মোবাইল', 'গাড়ি', 'বাইক', 'টিভি', 'ফ্রিজ', 'এসি', 'কম্পিউটার'
    ];
    
    // Common English product terms
    const englishProducts = [
      'sugar', 'salt', 'rice', 'oil', 'cigarette', 'tobacco', 'mobile',
      'car', 'bike', 'television', 'refrigerator', 'computer', 'phone'
    ];
    
    const allProducts = [...bengaliProducts, ...englishProducts];
    
    return allProducts.filter(product => 
      query.toLowerCase().includes(product.toLowerCase())
    );
  }

  /**
   * Suggest alternative searches
   */
  suggestAlternatives(query: string, results: HybridSearchResult): string[] {
    const suggestions: string[] = [];
    
    if (results.totalResults === 0) {
      const products = this.extractProductNames(query);
      
      if (products.length > 0) {
        suggestions.push(`Try searching for HS code of ${products[0]}`);
        suggestions.push(`Ask about ${products[0]} import procedures`);
      }
      
      suggestions.push("Try asking about general tax rates");
      suggestions.push("Ask about VAT registration procedures");
      suggestions.push("Try searching with product name in Bengali");
    }
    
    return suggestions;
  }
}

// Export singleton instance
export const queryRouter = new QueryRouter();