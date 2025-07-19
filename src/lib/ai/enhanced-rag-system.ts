/**
 * Enhanced RAG System for AI Tax Lawyer Bangladesh
 * Integrates multilingual query processing with advanced response generation
 */

import OpenAI from 'openai';
import { MultilingualQueryProcessor, QueryResult } from './multilingual-query-processor';

// Types
interface RAGResponse {
  answer: string;
  sources: Source[];
  confidence: number;
  language: 'bn' | 'en';
  response_type: 'direct_answer' | 'step_by_step' | 'calculation' | 'legal_reference';
  metadata: {
    total_sources: number;
    search_time_ms: number;
    generation_time_ms: number;
    query_complexity: 'simple' | 'moderate' | 'complex';
  };
}

interface Source {
  id: string;
  content: string;
  document_type: string;
  section_number?: string;
  relevance_score: number;
  citation: string;
}

interface ChatContext {
  user_type: 'salaried' | 'freelancer' | 'business' | 'general';
  conversation_history: ChatMessage[];
  user_language_preference: 'bn' | 'en' | 'auto';
  session_id: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: any;
}

class EnhancedRAGSystem {
  private openai: OpenAI;
  private queryProcessor: MultilingualQueryProcessor;
  private contextCache = new Map<string, ChatContext>();

  // Response templates for different scenarios
  private responseTemplates = {
    calculation: {
      bn: `আপনার কর গণনা:\n\n{calculation_details}\n\n**সূত্র:** {sources}\n\n**দ্রষ্টব্য:** এটি একটি আনুমানিক হিসাব। সঠিক পরামর্শের জন্য একজন কর বিশেষজ্ঞের সাথে যোগাযোগ করুন।`,
      en: `Your tax calculation:\n\n{calculation_details}\n\n**Sources:** {sources}\n\n**Note:** This is an estimated calculation. Please consult a tax professional for accurate advice.`
    },
    legal_reference: {
      bn: `আইনি তথ্য:\n\n{legal_content}\n\n**সূত্র:** {sources}\n\nআরও তথ্যের জন্য সংশ্লিষ্ট ধারা দেখুন।`,
      en: `Legal information:\n\n{legal_content}\n\n**Sources:** {sources}\n\nRefer to the relevant sections for more details.`
    }
  };

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });
    this.queryProcessor = new MultilingualQueryProcessor();
  }

  /**
   * Main chat function with context awareness
   */
  async chat(
    query: string,
    context: ChatContext,
    userId?: string
  ): Promise<RAGResponse> {
    const startTime = Date.now();
    
    try {
      console.log(`💬 Processing chat query: "${query}"`);
      
      // Step 1: Enhance query with conversation context
      const enhancedQuery = await this.enhanceQueryWithContext(query, context);
      
      // Step 2: Search for relevant documents
      const searchStartTime = Date.now();
      const searchResults = await this.queryProcessor.processQuery(
        enhancedQuery,
        userId,
        context.session_id
      );
      const searchTime = Date.now() - searchStartTime;
      
      // Step 3: Generate contextual response
      const generationStartTime = Date.now();
      const response = await this.generateContextualResponse(
        query,
        enhancedQuery,
        searchResults,
        context
      );
      const generationTime = Date.now() - generationStartTime;
      
      // Step 4: Update conversation context
      this.updateConversationContext(context, query, response.answer);
      
      // Step 5: Prepare final response
      const finalResponse: RAGResponse = {
        ...response,
        metadata: {
          total_sources: searchResults.length,
          search_time_ms: searchTime,
          generation_time_ms: generationTime,
          query_complexity: this.assessQueryComplexity(query, searchResults)
        }
      };
      
      console.log(`✅ Chat response generated in ${Date.now() - startTime}ms`);
      return finalResponse;
      
    } catch (error) {
      console.error('Chat processing error:', error);
      
      // Return fallback response
      return this.generateFallbackResponse(query, context.user_language_preference);
    }
  }

  /**
   * Enhance query with conversation context
   */
  private async enhanceQueryWithContext(
    query: string,
    context: ChatContext
  ): Promise<string> {
    // If this is the first message or no relevant context, return original
    if (context.conversation_history.length < 2) {
      return query;
    }

    try {
      // Get recent conversation history (last 3 messages)
      const recentHistory = context.conversation_history
        .slice(-6) // Last 3 exchanges (6 messages)
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{
          role: 'user',
          content: `Given this conversation history and the current query, enhance the query to include relevant context from previous messages. Keep it concise and focused on tax law.

Conversation history:
${recentHistory}

Current query: "${query}"

Enhanced query:`
        }],
        max_tokens: 100,
        temperature: 0.3
      });

      const enhanced = response.choices[0]?.message?.content?.trim();
      return enhanced || query;
      
    } catch (error) {
      console.warn('Query enhancement failed, using original:', error);
      return query;
    }
  }

  /**
   * Generate contextual response based on search results and conversation context
   */
  private async generateContextualResponse(
    originalQuery: string,
    enhancedQuery: string,
    searchResults: QueryResult[],
    context: ChatContext
  ): Promise<Omit<RAGResponse, 'metadata'>> {
    // Determine response language
    const responseLanguage = this.determineResponseLanguage(originalQuery, context);
    
    // Prepare sources
    const sources = this.prepareSources(searchResults);
    
    // Determine response type
    const responseType = this.determineResponseType(originalQuery, searchResults);
    
    // Generate appropriate response based on type
    let answer: string;
    let confidence: number;
    
    switch (responseType) {
      case 'calculation':
        ({ answer, confidence } = await this.generateCalculationResponse(
          originalQuery, sources, responseLanguage, context
        ));
        break;
        
      case 'legal_reference':
        ({ answer, confidence } = await this.generateLegalResponse(
          originalQuery, sources, responseLanguage
        ));
        break;
        
      case 'step_by_step':
        ({ answer, confidence } = await this.generateStepByStepResponse(
          originalQuery, sources, responseLanguage, context
        ));
        break;
        
      default:
        ({ answer, confidence } = await this.generateDirectAnswer(
          originalQuery, sources, responseLanguage
        ));
        break;
    }

    return {
      answer,
      sources,
      confidence,
      language: responseLanguage,
      response_type: responseType
    };
  }

  /**
   * Determine response language based on query and user preference
   */
  private determineResponseLanguage(query: string, context: ChatContext): 'bn' | 'en' {
    if (context.user_language_preference !== 'auto') {
      return context.user_language_preference;
    }
    
    // Detect from query
    const bengaliPattern = /[\u0980-\u09FF]/;
    return bengaliPattern.test(query) ? 'bn' : 'en';
  }

  /**
   * Prepare sources from search results
   */
  private prepareSources(searchResults: QueryResult[]): Source[] {
    return searchResults.slice(0, 5).map((result, index) => ({
      id: result.id,
      content: result.content.substring(0, 300) + '...', // Truncate for display
      document_type: result.metadata.document_type || 'unknown',
      section_number: result.metadata.section_number,
      relevance_score: result.score,
      citation: this.generateCitation(result)
    }));
  }

  /**
   * Generate citation for a source
   */
  private generateCitation(result: QueryResult): string {
    const metadata = result.metadata;
    
    if (metadata.document_type === 'income_tax') {
      return `আয়কর অধ্যাদেশ ১৯৮ৄ${metadata.section_number ? `, ধারা ${metadata.section_number}` : ''}`;
    } else if (metadata.document_type === 'finance_act') {
      return `অর্থ আইন ${metadata.act_year || '২০২৫'}${metadata.section_number ? `, ধারা ${metadata.section_number}` : ''}`;
    } else if (metadata.document_type === 'vat_act') {
      return `মূল্য সংযোজন কর আইন ২০১২${metadata.section_number ? `, ধারা ${metadata.section_number}` : ''}`;
    }
    
    return metadata.document_name || 'NBR নথি';
  }

  /**
   * Determine response type based on query content
   */
  private determineResponseType(query: string, searchResults: QueryResult[]): RAGResponse['response_type'] {
    const lowerQuery = query.toLowerCase();
    
    // Check for calculation-related queries
    if (/কত|কতটুকু|how\s*much|calculate|হিসাব|গণনা/i.test(lowerQuery)) {
      return 'calculation';
    }
    
    // Check for step-by-step procedure queries
    if (/কিভাবে|how\s*to|পদ্ধতি|নিয়ম|process|steps/i.test(lowerQuery)) {
      return 'step_by_step';
    }
    
    // Check for legal reference queries
    if (/ধারা|section|আইন|law|act/i.test(lowerQuery) || 
        searchResults.some(r => r.metadata.section_number)) {
      return 'legal_reference';
    }
    
    return 'direct_answer';
  }

  /**
   * Generate calculation response
   */
  private async generateCalculationResponse(
    query: string,
    sources: Source[],
    language: 'bn' | 'en',
    context: ChatContext
  ): Promise<{ answer: string; confidence: number }> {
    const sourcesText = sources.map(s => s.content).join('\n\n');
    const userTypeContext = this.getUserTypeContext(context.user_type);
    
    const systemPrompt = language === 'bn' 
      ? `আপনি একজন বাংলাদেশী কর বিশেষজ্ঞ। ব্যবহারকারীর প্রশ্নের উত্তর দিন এবং প্রয়োজনে কর গণনা করুন। ${userTypeContext.bn}`
      : `You are a Bangladesh tax expert. Answer the user's question and perform tax calculations if needed. ${userTypeContext.en}`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: language === 'bn'
            ? `প্রশ্ন: ${query}\n\nসংশ্লিষ্ট আইনি তথ্য:\n${sourcesText}\n\nউত্তর (গণনার ধাপ সহ):`
            : `Question: ${query}\n\nRelevant legal information:\n${sourcesText}\n\nAnswer (with calculation steps):`
        }
      ],
      max_tokens: 800,
      temperature: 0.3
    });

    const answer = response.choices[0]?.message?.content || 'উত্তর তৈরি করতে ব্যর্থ।';
    const confidence = this.calculateConfidence(answer, sources);

    return { answer, confidence };
  }

  /**
   * Generate legal reference response
   */
  private async generateLegalResponse(
    query: string,
    sources: Source[],
    language: 'bn' | 'en'
  ): Promise<{ answer: string; confidence: number }> {
    const sourcesText = sources.map(s => `[${s.citation}] ${s.content}`).join('\n\n');
    
    const systemPrompt = language === 'bn'
      ? 'আপনি একজন বাংলাদেশী আইন বিশেষজ্ঞ। সঠিক আইনি তথ্য প্রদান করুন এবং উৎস উল্লেখ করুন।'
      : 'You are a Bangladesh law expert. Provide accurate legal information with proper citations.';

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: language === 'bn'
            ? `প্রশ্ন: ${query}\n\nআইনি তথ্য:\n${sourcesText}\n\nউত্তর:`
            : `Question: ${query}\n\nLegal information:\n${sourcesText}\n\nAnswer:`
        }
      ],
      max_tokens: 600,
      temperature: 0.2
    });

    const answer = response.choices[0]?.message?.content || 'উত্তর তৈরি করতে ব্যর্থ।';
    const confidence = this.calculateConfidence(answer, sources);

    return { answer, confidence };
  }

  /**
   * Generate step-by-step response
   */
  private async generateStepByStepResponse(
    query: string,
    sources: Source[],
    language: 'bn' | 'en',
    context: ChatContext
  ): Promise<{ answer: string; confidence: number }> {
    const sourcesText = sources.map(s => s.content).join('\n\n');
    const userTypeContext = this.getUserTypeContext(context.user_type);
    
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: language === 'bn'
            ? `আপনি একজন সহায়ক কর বিশেষজ্ঞ। ধাপে ধাপে নির্দেশনা প্রদান করুন। ${userTypeContext.bn}`
            : `You are a helpful tax expert. Provide step-by-step guidance. ${userTypeContext.en}`
        },
        {
          role: 'user',
          content: language === 'bn'
            ? `প্রশ্ন: ${query}\n\nতথ্য:\n${sourcesText}\n\nধাপে ধাপে উত্তর:`
            : `Question: ${query}\n\nInformation:\n${sourcesText}\n\nStep-by-step answer:`
        }
      ],
      max_tokens: 700,
      temperature: 0.3
    });

    const answer = response.choices[0]?.message?.content || 'উত্তর তৈরি করতে ব্যর্থ।';
    const confidence = this.calculateConfidence(answer, sources);

    return { answer, confidence };
  }

  /**
   * Generate direct answer
   */
  private async generateDirectAnswer(
    query: string,
    sources: Source[],
    language: 'bn' | 'en'
  ): Promise<{ answer: string; confidence: number }> {
    const sourcesText = sources.map(s => s.content).join('\n\n');
    
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: language === 'bn'
            ? 'আপনি একজন বাংলাদেশী কর বিশেষজ্ঞ। সংক্ষিপ্ত এবং সঠিক উত্তর দিন।'
            : 'You are a Bangladesh tax expert. Provide concise and accurate answers.'
        },
        {
          role: 'user',
          content: language === 'bn'
            ? `প্রশ্ন: ${query}\n\nতথ্য:\n${sourcesText}\n\nউত্তর:`
            : `Question: ${query}\n\nInformation:\n${sourcesText}\n\nAnswer:`
        }
      ],
      max_tokens: 500,
      temperature: 0.3
    });

    const answer = response.choices[0]?.message?.content || 'উত্তর তৈরি করতে ব্যর্থ।';
    const confidence = this.calculateConfidence(answer, sources);

    return { answer, confidence };
  }

  /**
   * Get user type specific context
   */
  private getUserTypeContext(userType: string): { bn: string; en: string } {
    const contexts = {
      salaried: {
        bn: 'ব্যবহারকারী একজন বেতনভোগী কর্মচারী।',
        en: 'The user is a salaried employee.'
      },
      freelancer: {
        bn: 'ব্যবহারকারী একজন ফ্রিল্যান্সার।',
        en: 'The user is a freelancer.'
      },
      business: {
        bn: 'ব্যবহারকারী একজন ব্যবসায়ী।',
        en: 'The user is a business owner.'
      },
      general: {
        bn: 'সাধারণ ব্যবহারকারী।',
        en: 'General user.'
      }
    };

    return contexts[userType] || contexts.general;
  }

  /**
   * Calculate confidence score based on response quality and source relevance
   */
  private calculateConfidence(answer: string, sources: Source[]): number {
    let confidence = 0.5; // Base confidence
    
    // Boost confidence based on number of relevant sources
    if (sources.length >= 3) confidence += 0.2;
    else if (sources.length >= 2) confidence += 0.1;
    
    // Boost confidence based on source relevance scores
    const avgRelevance = sources.reduce((sum, s) => sum + s.score, 0) / sources.length;
    confidence += avgRelevance * 0.3;
    
    // Reduce confidence for very short answers
    if (answer.length < 100) confidence -= 0.1;
    
    // Boost confidence for structured answers (with numbers, bullets, etc.)
    if (/\d+\.|\•|\-/.test(answer)) confidence += 0.1;
    
    return Math.min(Math.max(confidence, 0.1), 0.95); // Clamp between 0.1 and 0.95
  }

  /**
   * Assess query complexity
   */
  private assessQueryComplexity(query: string, sources: QueryResult[]): 'simple' | 'moderate' | 'complex' {
    const words = query.split(/\s+/).length;
    const hasCalculation = /কত|কতটুকু|how\s*much|calculate/i.test(query);
    const hasMultipleConcepts = sources.length > 5;
    
    if (words > 20 || hasMultipleConcepts) return 'complex';
    if (words > 10 || hasCalculation) return 'moderate';
    return 'simple';
  }

  /**
   * Update conversation context
   */
  private updateConversationContext(
    context: ChatContext,
    userMessage: string,
    assistantResponse: string
  ): void {
    context.conversation_history.push(
      {
        role: 'user',
        content: userMessage,
        timestamp: new Date()
      },
      {
        role: 'assistant',
        content: assistantResponse,
        timestamp: new Date()
      }
    );

    // Keep only last 20 messages to prevent context from growing too large
    if (context.conversation_history.length > 20) {
      context.conversation_history = context.conversation_history.slice(-20);
    }
  }

  /**
   * Generate fallback response when main processing fails
   */
  private generateFallbackResponse(
    query: string,
    language: 'bn' | 'en' | 'auto'
  ): RAGResponse {
    const isBengali = language === 'bn' || /[\u0980-\u09FF]/.test(query);
    
    const fallbackMessage = isBengali
      ? 'দুঃখিত, আপনার প্রশ্নের উত্তর দিতে সমস্যা হচ্ছে। অনুগ্রহ করে আবার চেষ্টা করুন বা প্রশ্নটি ভিন্নভাবে জিজ্ঞাসা করুন।'
      : 'Sorry, I\'m having trouble answering your question. Please try again or rephrase your question.';

    return {
      answer: fallbackMessage,
      sources: [],
      confidence: 0.1,
      language: isBengali ? 'bn' : 'en',
      response_type: 'direct_answer',
      metadata: {
        total_sources: 0,
        search_time_ms: 0,
        generation_time_ms: 0,
        query_complexity: 'simple'
      }
    };
  }

  /**
   * Clear context cache (call periodically)
   */
  clearContextCache(): void {
    this.contextCache.clear();
  }
}

export { EnhancedRAGSystem, RAGResponse, ChatContext, ChatMessage };
export default EnhancedRAGSystem;