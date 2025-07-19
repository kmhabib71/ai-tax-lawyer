/**
 * Multilingual Query Processor for AI Tax Lawyer Bangladesh
 * Handles Bengali, English, and Banglish queries with intelligent routing
 */

import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

// Types
interface QueryResult {
  id: string;
  content: string;
  metadata: any;
  score: number;
  source: 'semantic' | 'keyword' | 'fuzzy' | 'banglish';
  keywords_bn?: string[];
  keywords_en?: string[];
}

interface QueryAnalysis {
  original_query: string;
  detected_language: 'bn' | 'en' | 'banglish' | 'mixed';
  cleaned_query: string;
  translated_queries: {
    bengali?: string;
    english?: string;
  };
  query_intent: 'tax_calculation' | 'law_lookup' | 'procedure' | 'general';
  extracted_entities: {
    amounts?: string[];
    dates?: string[];
    sections?: string[];
    tax_types?: string[];
  };
}

interface SearchStrategy {
  primary: 'semantic' | 'keyword' | 'fuzzy' | 'banglish';
  fallback: ('semantic' | 'keyword' | 'fuzzy' | 'banglish')[];
  weights: {
    semantic: number;
    keyword: number;
    fuzzy: number;
  };
}

class MultilingualQueryProcessor {
  private openai: OpenAI;
  private supabase: any;
  private queryCache = new Map<string, QueryResult[]>();
  private translationCache = new Map<string, string>();

  // Language detection patterns
  private readonly bengaliPattern = /[\u0980-\u09FF]/;
  private readonly englishPattern = /[A-Za-z]/;
  
  // Banglish patterns and mappings
  private readonly banglishMappings = new Map([
    // Tax related terms
    ['tax', 'কর'], ['ট্যাক্স', 'কর'],
    ['income', 'আয়'], ['ইনকাম', 'আয়'],
    ['salary', 'বেতন'], ['সালারি', 'বেতন'],
    ['vat', 'মূসক'], ['ভ্যাট', 'মূসক'],
    ['deduction', 'ছাড়'], ['ডিডাকশন', 'ছাড়'],
    ['return', 'রিটার্ন'], ['রিটার্ন', 'ফেরত'],
    ['payment', 'পেমেন্ট'], ['পেমেন্ট', 'পরিশোধ'],
    ['exemption', 'ছাড়'], ['এক্সেম্পশন', 'ছাড়'],
    
    // Numbers in Banglish
    ['lakh', 'লক্ষ'], ['লাখ', 'লক্ষ'],
    ['crore', 'কোটি'], ['কোর', 'কোটি'],
    ['thousand', 'হাজার'], ['হাজার', 'হাজার'],
    
    // Common query terms
    ['koto', 'কত'], ['কত', 'কত'],
    ['ki', 'কি'], ['কি', 'কি'],
    ['kivabe', 'কিভাবে'], ['কিভাবে', 'কিভাবে'],
    ['kemon', 'কেমন'], ['কেমন', 'কেমন']
  ]);

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });

    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  /**
   * Main query processing function
   */
  async processQuery(
    query: string, 
    userId?: string, 
    sessionId?: string
  ): Promise<QueryResult[]> {
    const startTime = Date.now();
    
    try {
      console.log(`🔍 Processing query: "${query}"`);
      
      // Step 1: Analyze the query
      const analysis = await this.analyzeQuery(query);
      console.log(`📊 Query analysis:`, analysis);
      
      // Step 2: Determine search strategy
      const strategy = this.determineSearchStrategy(analysis);
      console.log(`🎯 Search strategy:`, strategy);
      
      // Step 3: Execute search with multiple strategies
      const results = await this.executeSearch(analysis, strategy);
      
      // Step 4: Post-process and rank results
      const rankedResults = this.rankAndDeduplicateResults(results, analysis);
      
      // Step 5: Log analytics
      const responseTime = Date.now() - startTime;
      await this.logQueryAnalytics(analysis, rankedResults.length, responseTime, userId, sessionId);
      
      console.log(`✅ Found ${rankedResults.length} results in ${responseTime}ms`);
      return rankedResults;
      
    } catch (error) {
      console.error('Query processing error:', error);
      throw error;
    }
  }

  /**
   * Analyze query to understand language, intent, and entities
   */
  private async analyzeQuery(query: string): Promise<QueryAnalysis> {
    const analysis: QueryAnalysis = {
      original_query: query,
      detected_language: this.detectLanguage(query),
      cleaned_query: this.cleanQuery(query),
      translated_queries: {},
      query_intent: 'general',
      extracted_entities: {}
    };

    // Extract entities first
    analysis.extracted_entities = this.extractEntities(analysis.cleaned_query);
    
    // Determine intent
    analysis.query_intent = this.determineIntent(analysis.cleaned_query, analysis.extracted_entities);
    
    // Generate translations for cross-language search
    analysis.translated_queries = await this.generateTranslations(
      analysis.cleaned_query, 
      analysis.detected_language
    );

    return analysis;
  }

  /**
   * Detect query language
   */
  private detectLanguage(query: string): 'bn' | 'en' | 'banglish' | 'mixed' {
    const hasBengali = this.bengaliPattern.test(query);
    const hasEnglish = this.englishPattern.test(query);
    const hasBanglish = this.containsBanglish(query);

    if (hasBengali && hasEnglish) {
      return 'mixed';
    } else if (hasBanglish) {
      return 'banglish';
    } else if (hasBengali) {
      return 'bn';
    } else {
      return 'en';
    }
  }

  /**
   * Check if query contains Banglish terms
   */
  private containsBanglish(query: string): boolean {
    const lowerQuery = query.toLowerCase();
    for (const [banglish] of this.banglishMappings) {
      if (lowerQuery.includes(banglish.toLowerCase())) {
        return true;
      }
    }
    return false;
  }

  /**
   * Clean and normalize query
   */
  private cleanQuery(query: string): string {
    let cleaned = query.trim();
    
    // Remove extra whitespace
    cleaned = cleaned.replace(/\s+/g, ' ');
    
    // Handle Banglish conversion
    cleaned = this.convertBanglishTerms(cleaned);
    
    // Normalize Bengali numbers
    cleaned = this.normalizeBengaliNumbers(cleaned);
    
    return cleaned;
  }

  /**
   * Convert Banglish terms to proper Bengali/English
   */
  private convertBanglishTerms(query: string): string {
    let converted = query;
    
    for (const [banglish, bengali] of this.banglishMappings) {
      const regex = new RegExp(`\\b${banglish}\\b`, 'gi');
      converted = converted.replace(regex, bengali);
    }
    
    return converted;
  }

  /**
   * Normalize Bengali numbers
   */
  private normalizeBengaliNumbers(query: string): string {
    const bengaliToEnglish = {
      '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
      '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
    };
    
    let normalized = query;
    for (const [bengali, english] of Object.entries(bengaliToEnglish)) {
      normalized = normalized.replace(new RegExp(bengali, 'g'), english);
    }
    
    return normalized;
  }

  /**
   * Extract entities from query
   */
  private extractEntities(query: string): QueryAnalysis['extracted_entities'] {
    const entities: QueryAnalysis['extracted_entities'] = {};
    
    // Extract amounts (with lakh, crore, thousand)
    const amountPattern = /(\d+(?:\.\d+)?)\s*(লক্ষ|লাখ|কোটি|হাজার|lakh|crore|thousand|k|m)/gi;
    const amounts = [...query.matchAll(amountPattern)].map(match => match[0]);
    if (amounts.length > 0) entities.amounts = amounts;
    
    // Extract dates
    const datePattern = /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}|\d{4}[-\/]\d{1,2}[-\/]\d{1,2})/g;
    const dates = [...query.matchAll(datePattern)].map(match => match[0]);
    if (dates.length > 0) entities.dates = dates;
    
    // Extract section references
    const sectionPattern = /(ধারা|section)\s*(\d+[a-z]*)/gi;
    const sections = [...query.matchAll(sectionPattern)].map(match => match[0]);
    if (sections.length > 0) entities.sections = sections;
    
    // Extract tax types
    const taxTypes = [];
    if (/আয়কর|income\s*tax/i.test(query)) taxTypes.push('income_tax');
    if (/মূসক|vat/i.test(query)) taxTypes.push('vat');
    if (/অর্থ|finance/i.test(query)) taxTypes.push('finance');
    if (taxTypes.length > 0) entities.tax_types = taxTypes;
    
    return entities;
  }

  /**
   * Determine query intent
   */
  private determineIntent(query: string, entities: QueryAnalysis['extracted_entities']): QueryAnalysis['query_intent'] {
    const lowerQuery = query.toLowerCase();
    
    // Tax calculation intent
    if (/কত|কতটুকু|how\s*much|calculate|হিসাব/i.test(lowerQuery) && entities.amounts) {
      return 'tax_calculation';
    }
    
    // Law lookup intent
    if (/ধারা|section|আইন|law|act/i.test(lowerQuery) || entities.sections) {
      return 'law_lookup';
    }
    
    // Procedure intent
    if (/কিভাবে|how\s*to|process|পদ্ধতি|নিয়ম/i.test(lowerQuery)) {
      return 'procedure';
    }
    
    return 'general';
  }

  /**
   * Generate translations for cross-language search
   */
  private async generateTranslations(
    query: string, 
    detectedLanguage: 'bn' | 'en' | 'banglish' | 'mixed'
  ): Promise<{ bengali?: string; english?: string }> {
    const translations: { bengali?: string; english?: string } = {};
    
    try {
      // Check cache first
      const cacheKey = `${query}_${detectedLanguage}`;
      if (this.translationCache.has(cacheKey)) {
        const cached = this.translationCache.get(cacheKey)!;
        const [bengali, english] = cached.split('|');
        return { bengali, english };
      }
      
      // Generate translations using OpenAI
      if (detectedLanguage === 'en' || detectedLanguage === 'mixed') {
        translations.bengali = await this.translateToBengali(query);
      }
      
      if (detectedLanguage === 'bn' || detectedLanguage === 'mixed') {
        translations.english = await this.translateToEnglish(query);
      }
      
      // Cache translations
      this.translationCache.set(cacheKey, `${translations.bengali || ''}|${translations.english || ''}`);
      
    } catch (error) {
      console.warn('Translation failed, using original query:', error);
    }
    
    return translations;
  }

  /**
   * Translate query to Bengali
   */
  private async translateToBengali(query: string): Promise<string> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{
        role: 'user',
        content: `Translate this tax-related query to Bengali, keeping legal terms accurate:
        
        Query: "${query}"
        
        Translation:`
      }],
      max_tokens: 100,
      temperature: 0.3
    });
    
    return response.choices[0]?.message?.content?.trim() || query;
  }

  /**
   * Translate query to English
   */
  private async translateToEnglish(query: string): Promise<string> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{
        role: 'user',
        content: `Translate this Bengali tax query to English, keeping legal terms accurate:
        
        Query: "${query}"
        
        Translation:`
      }],
      max_tokens: 100,
      temperature: 0.3
    });
    
    return response.choices[0]?.message?.content?.trim() || query;
  }

  /**
   * Determine optimal search strategy
   */
  private determineSearchStrategy(analysis: QueryAnalysis): SearchStrategy {
    const strategy: SearchStrategy = {
      primary: 'semantic',
      fallback: [],
      weights: { semantic: 0.7, keyword: 0.3, fuzzy: 0.2 }
    };

    // Adjust strategy based on language and intent
    switch (analysis.detected_language) {
      case 'bn':
        strategy.primary = 'semantic';
        strategy.fallback = ['fuzzy', 'keyword'];
        strategy.weights = { semantic: 0.6, keyword: 0.2, fuzzy: 0.4 };
        break;
        
      case 'en':
        strategy.primary = 'semantic';
        strategy.fallback = ['keyword'];
        strategy.weights = { semantic: 0.8, keyword: 0.4, fuzzy: 0.1 };
        break;
        
      case 'banglish':
        strategy.primary = 'banglish';
        strategy.fallback = ['semantic', 'fuzzy'];
        strategy.weights = { semantic: 0.5, keyword: 0.3, fuzzy: 0.4 };
        break;
        
      case 'mixed':
        strategy.primary = 'semantic';
        strategy.fallback = ['keyword', 'fuzzy', 'banglish'];
        strategy.weights = { semantic: 0.6, keyword: 0.3, fuzzy: 0.3 };
        break;
    }

    // Adjust for specific intents
    if (analysis.query_intent === 'law_lookup') {
      strategy.weights.keyword = 0.5; // Boost keyword search for exact legal terms
    }

    return strategy;
  }

  /**
   * Execute search using multiple strategies
   */
  private async executeSearch(analysis: QueryAnalysis, strategy: SearchStrategy): Promise<QueryResult[]> {
    const allResults: QueryResult[] = [];
    
    // Primary search
    const primaryResults = await this.executeSingleSearch(
      analysis, 
      strategy.primary, 
      strategy.weights
    );
    allResults.push(...primaryResults);
    
    // Fallback searches if primary didn't return enough results
    if (primaryResults.length < 5) {
      for (const fallbackMethod of strategy.fallback) {
        const fallbackResults = await this.executeSingleSearch(
          analysis, 
          fallbackMethod, 
          strategy.weights
        );
        allResults.push(...fallbackResults);
        
        if (allResults.length >= 10) break; // Sufficient results found
      }
    }
    
    return allResults;
  }

  /**
   * Execute single search method
   */
  private async executeSingleSearch(
    analysis: QueryAnalysis,
    method: 'semantic' | 'keyword' | 'fuzzy' | 'banglish',
    weights: SearchStrategy['weights']
  ): Promise<QueryResult[]> {
    try {
      switch (method) {
        case 'semantic':
          return await this.semanticSearch(analysis, weights.semantic);
          
        case 'keyword':
          return await this.keywordSearch(analysis, weights.keyword);
          
        case 'fuzzy':
          return await this.fuzzySearch(analysis, weights.fuzzy);
          
        case 'banglish':
          return await this.banglishSearch(analysis);
          
        default:
          return [];
      }
    } catch (error) {
      console.error(`Search method ${method} failed:`, error);
      return [];
    }
  }

  /**
   * Semantic search using embeddings
   */
  private async semanticSearch(analysis: QueryAnalysis, weight: number): Promise<QueryResult[]> {
    // Generate embedding for the query
    const embedding = await this.generateQueryEmbedding(analysis.cleaned_query);
    
    // Use the hybrid search function
    const { data, error } = await this.supabase.rpc('hybrid_search', {
      query_text: analysis.cleaned_query,
      query_embedding: embedding,
      match_threshold: 0.5,
      semantic_weight: 0.8,
      keyword_weight: 0.2,
      max_results: 10
    });
    
    if (error) {
      console.error('Semantic search error:', error);
      return [];
    }
    
    return data.map((row: any) => ({
      id: row.id,
      content: row.content,
      metadata: row.metadata,
      score: row.semantic_score * weight,
      source: 'semantic' as const,
      keywords_bn: row.keywords_bn,
      keywords_en: row.keywords_en
    }));
  }

  /**
   * Keyword search
   */
  private async keywordSearch(analysis: QueryAnalysis, weight: number): Promise<QueryResult[]> {
    const { data, error } = await this.supabase
      .from('document_chunks')
      .select('id, content, metadata, keywords_bn, keywords_en')
      .textSearch('search_vector', analysis.cleaned_query)
      .limit(10);
    
    if (error) {
      console.error('Keyword search error:', error);
      return [];
    }
    
    return data.map((row: any, index: number) => ({
      id: row.id,
      content: row.content,
      metadata: row.metadata,
      score: (10 - index) / 10 * weight, // Simple ranking
      source: 'keyword' as const,
      keywords_bn: row.keywords_bn,
      keywords_en: row.keywords_en
    }));
  }

  /**
   * Fuzzy search for Bengali text
   */
  private async fuzzySearch(analysis: QueryAnalysis, weight: number): Promise<QueryResult[]> {
    const { data, error } = await this.supabase.rpc('bengali_fuzzy_search', {
      query_text: analysis.cleaned_query,
      similarity_threshold: 0.3,
      max_results: 10
    });
    
    if (error) {
      console.error('Fuzzy search error:', error);
      return [];
    }
    
    return data.map((row: any) => ({
      id: row.id,
      content: row.content,
      metadata: row.metadata,
      score: row.similarity_score * weight,
      source: 'fuzzy' as const
    }));
  }

  /**
   * Banglish search
   */
  private async banglishSearch(analysis: QueryAnalysis): Promise<QueryResult[]> {
    const { data, error } = await this.supabase.rpc('banglish_search', {
      query_text: analysis.cleaned_query,
      max_results: 10
    });
    
    if (error) {
      console.error('Banglish search error:', error);
      return [];
    }
    
    return data.map((row: any, index: number) => ({
      id: row.id,
      content: row.content,
      metadata: row.metadata,
      score: (10 - index) / 10 * 0.8, // High weight for Banglish matches
      source: 'banglish' as const
    }));
  }

  /**
   * Generate embedding for query
   */
  private async generateQueryEmbedding(query: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
      encoding_format: 'float'
    });
    
    return response.data[0].embedding;
  }

  /**
   * Rank and deduplicate results
   */
  private rankAndDeduplicateResults(results: QueryResult[], analysis: QueryAnalysis): QueryResult[] {
    // Remove duplicates based on content similarity
    const unique = new Map<string, QueryResult>();
    
    for (const result of results) {
      const key = result.id;
      if (!unique.has(key) || unique.get(key)!.score < result.score) {
        unique.set(key, result);
      }
    }
    
    // Convert to array and sort by score
    const uniqueResults = Array.from(unique.values());
    
    // Apply additional ranking factors
    uniqueResults.forEach(result => {
      // Boost score for relevant document types
      if (analysis.query_intent === 'tax_calculation' && 
          result.metadata.document_type === 'finance_act') {
        result.score *= 1.2;
      }
      
      if (analysis.query_intent === 'law_lookup' && 
          result.metadata.document_type === 'income_tax') {
        result.score *= 1.2;
      }
      
      // Boost for language match
      if (result.metadata.language === analysis.detected_language) {
        result.score *= 1.1;
      }
    });
    
    // Sort by final score and return top 10
    return uniqueResults
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }

  /**
   * Log query analytics
   */
  private async logQueryAnalytics(
    analysis: QueryAnalysis,
    resultCount: number,
    responseTime: number,
    userId?: string,
    sessionId?: string
  ): Promise<void> {
    try {
      await this.supabase.rpc('log_search_query', {
        p_query_text: analysis.original_query,
        p_query_language: analysis.detected_language,
        p_query_type: 'multilingual',
        p_results_count: resultCount,
        p_response_time_ms: responseTime,
        p_user_id: userId,
        p_session_id: sessionId
      });
    } catch (error) {
      console.error('Failed to log analytics:', error);
    }
  }

  /**
   * Clear caches (call periodically)
   */
  clearCaches(): void {
    this.queryCache.clear();
    this.translationCache.clear();
  }
}

export { MultilingualQueryProcessor, QueryResult, QueryAnalysis };
export default MultilingualQueryProcessor;