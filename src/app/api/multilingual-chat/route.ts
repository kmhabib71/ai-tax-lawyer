/**
 * Enhanced Multilingual Chat API for AI Tax Lawyer Bangladesh
 * Supports Bengali, English, and Banglish queries with advanced RAG
 */

import { NextRequest, NextResponse } from 'next/server';
import { EnhancedRAGSystem, ChatContext } from '@/lib/ai/enhanced-rag-system';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';

// Initialize RAG system
const ragSystem = new EnhancedRAGSystem();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      message, 
      userType = 'general', 
      language = 'auto',
      sessionId,
      conversationHistory = []
    } = body;

    // Validate required fields
    if (!message || !message.trim()) {
      return NextResponse.json({
        success: false,
        error: 'Message is required'
      }, { status: 400 });
    }

    // Get user session
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    // Create chat context
    const context: ChatContext = {
      user_type: userType,
      conversation_history: conversationHistory.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.timestamp || Date.now())
      })),
      user_language_preference: language,
      session_id: sessionId || `session_${Date.now()}`
    };

    // Process the chat query
    const response = await ragSystem.chat(message, context, userId);

    return NextResponse.json({
      success: true,
      data: response,
      session_id: context.session_id
    });

  } catch (error) {
    console.error('Multilingual chat API error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to process chat message',
      details: error.message
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    if (action === 'test_query') {
      // Test the multilingual system with sample queries
      const testQueries = [
        'আমার বেতন ৫ লক্ষ টাকা, কত কর দিতে হবে?',
        'What is the tax rate for freelancers in Bangladesh?',
        'Amar income 6 lakh, tax koto?',
        'VAT registration কিভাবে করবো?'
      ];

      const results = [];
      for (const query of testQueries) {
        try {
          const context: ChatContext = {
            user_type: 'general',
            conversation_history: [],
            user_language_preference: 'auto',
            session_id: `test_${Date.now()}`
          };

          const response = await ragSystem.chat(query, context);
          results.push({
            query,
            response: response.answer.substring(0, 200) + '...',
            language: response.language,
            confidence: response.confidence,
            sources: response.sources.length
          });
        } catch (error) {
          results.push({
            query,
            error: error.message
          });
        }
      }

      return NextResponse.json({
        success: true,
        test_results: results
      });

    } else if (action === 'capabilities') {
      // Return system capabilities
      return NextResponse.json({
        success: true,
        capabilities: {
          languages: ['Bengali', 'English', 'Banglish'],
          user_types: ['salaried', 'freelancer', 'business', 'general'],
          response_types: ['direct_answer', 'step_by_step', 'calculation', 'legal_reference'],
          features: [
            'Multilingual query processing',
            'Context-aware conversations',
            'Semantic + keyword + fuzzy search',
            'Bengali legal term understanding',
            'Banglish query translation',
            'Citation and source tracking',
            'Confidence scoring',
            'User type customization'
          ],
          search_methods: [
            'Vector similarity search',
            'Keyword matching',
            'Bengali fuzzy matching',
            'Banglish term mapping',
            'Hybrid ranking'
          ]
        }
      });

    } else {
      // Default API information
      return NextResponse.json({
        message: 'AI Tax Lawyer Bangladesh - Multilingual Chat API',
        status: 'operational',
        version: '2.0.0',
        description: 'Advanced RAG system supporting Bengali, English, and Banglish queries',
        endpoints: {
          'POST /api/multilingual-chat': {
            description: 'Process chat messages with context',
            required: ['message'],
            optional: ['userType', 'language', 'sessionId', 'conversationHistory']
          },
          'GET /api/multilingual-chat': {
            'action=test_query': 'Test system with sample queries',
            'action=capabilities': 'Get system capabilities',
            'default': 'API information'
          }
        },
        supported_languages: ['Bengali (bn)', 'English (en)', 'Banglish (mixed)'],
        supported_user_types: ['salaried', 'freelancer', 'business', 'general'],
        example_queries: [
          'আমার বেতনের কর কত?',
          'How to file VAT return?',
          'Freelancer er jonno ki ki deduction ase?',
          'ধারা ২৫ সম্পর্কে বলুন'
        ]
      });
    }

  } catch (error) {
    console.error('Multilingual chat GET error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}