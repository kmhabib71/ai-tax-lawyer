import { NextRequest, NextResponse } from 'next/server'
import { taxAdvisorService, TaxScenario } from '@/lib/ai/tax-advisor'
import connectDB from '@/lib/db/connection'

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    const body = await request.json()
    const { scenario, question } = body as {
      scenario: TaxScenario
      question?: string
    }
    
    if (!scenario || !scenario.userType) {
      return NextResponse.json(
        { error: 'Tax scenario with userType is required' },
        { status: 400 }
      )
    }
    
    // Validate scenario data
    const validationError = validateScenario(scenario)
    if (validationError) {
      return NextResponse.json(
        { error: validationError },
        { status: 400 }
      )
    }
    
    let result
    
    if (question) {
      // Get personalized advice for specific question
      result = await taxAdvisorService.getPersonalizedAdvice(scenario, question)
      
      return NextResponse.json({
        success: true,
        type: 'consultation',
        data: {
          response: result.response,
          confidence: result.confidence,
          sources: result.sources,
          citations: result.citations,
          metadata: {
            tokens: result.tokens,
            cost: result.cost
          }
        }
      })
    } else {
      // Analyze scenario and provide comprehensive advice
      result = await taxAdvisorService.analyzeScenario(scenario)
      
      return NextResponse.json({
        success: true,
        type: 'analysis',
        data: result
      })
    }
    
  } catch (error) {
    console.error('Tax advice API error:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to process tax advice request. Please try again.'
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'AI Tax Lawyer - Tax Advice API',
    status: 'operational',
    version: '1.0.0',
    endpoints: {
      'POST /api/tax-advice': 'Get tax analysis or personalized advice',
    },
    supportedUserTypes: ['salaried', 'freelancer', 'landlord', 'business', 'other'],
    currentAssessmentYear: '2024-25'
  })
}

function validateScenario(scenario: TaxScenario): string | null {
  const validUserTypes = ['salaried', 'freelancer', 'landlord', 'business', 'other']
  
  if (!validUserTypes.includes(scenario.userType)) {
    return `Invalid userType. Must be one of: ${validUserTypes.join(', ')}`
  }
  
  if (!scenario.assessmentYear) {
    return 'Assessment year is required'
  }
  
  // Validate income values
  const incomeValues = Object.values(scenario.income || {})
  if (incomeValues.some(val => val !== undefined && (val < 0 || val > 100000000))) {
    return 'Income values must be between 0 and 100,000,000 BDT'
  }
  
  // Validate deduction values
  const deductionValues = Object.values(scenario.deductions || {})
  if (deductionValues.some(val => val !== undefined && (val < 0 || val > 50000000))) {
    return 'Deduction values must be between 0 and 50,000,000 BDT'
  }
  
  return null
}