import { NextRequest, NextResponse } from 'next/server'
import { TaxScenario, taxAdvisorService } from '@/lib/ai/tax-advisor'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { apiRateLimit } from '@/lib/auth/rate-limit'

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const { success, limit, reset, remaining } = apiRateLimit(request)
    
    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': reset.getTime().toString(),
          }
        }
      )
    }

    // Authentication check (optional for basic calculator, required for advanced features)
    const session = await getServerSession(authOptions)
    
    // Parse request body
    const body = await request.json()
    const scenario: TaxScenario = body

    // Validate required fields
    if (!scenario.userType || !scenario.assessmentYear) {
      return NextResponse.json(
        { error: 'Missing required fields: userType and assessmentYear' },
        { status: 400 }
      )
    }

    // Validate income values
    const totalIncome = Object.values(scenario.income).reduce((sum, val) => sum + (val || 0), 0)
    if (totalIncome < 0) {
      return NextResponse.json(
        { error: 'Income values cannot be negative' },
        { status: 400 }
      )
    }

    // Validate deduction values
    const totalDeductions = Object.values(scenario.deductions).reduce((sum, val) => sum + (val || 0), 0)
    if (totalDeductions < 0) {
      return NextResponse.json(
        { error: 'Deduction values cannot be negative' },
        { status: 400 }
      )
    }

    // Calculate tax advice
    const advice = await taxAdvisorService.analyzeScenario(scenario)

    // Log the calculation for analytics (if user is authenticated)
    if (session?.user?.email) {
      try {
        // TODO: Log calculation to database for analytics
        console.log(`Tax calculation performed by ${session.user.email}:`, {
          userType: scenario.userType,
          totalIncome,
          currentTax: advice.currentTax,
          potentialSavings: advice.potentialSavings,
          timestamp: new Date().toISOString()
        })
      } catch (logError) {
        console.error('Failed to log tax calculation:', logError)
        // Don't fail the request if logging fails
      }
    }

    // Return the advice
    return NextResponse.json({
      success: true,
      data: advice,
      metadata: {
        calculatedAt: new Date().toISOString(),
        userAuthenticated: !!session,
        rateLimit: {
          remaining,
          reset: reset.getTime()
        }
      }
    })

  } catch (error) {
    console.error('Tax calculation error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to calculate tax. Please check your input and try again.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  // Return calculator metadata and tax rates
  try {
    const searchParams = request.nextUrl.searchParams
    const assessmentYear = searchParams.get('year') || '2024-25'

    // Current tax rates and limits for Bangladesh
    const taxInfo = {
      assessmentYear,
      basicExemption: 350000,
      taxSlabs: [
        { min: 0, max: 350000, rate: 0, description: 'Tax-free' },
        { min: 350000, max: 450000, rate: 5, description: '5%' },
        { min: 450000, max: 750000, rate: 10, description: '10%' },
        { min: 750000, max: 1150000, rate: 15, description: '15%' },
        { min: 1150000, max: 1650000, rate: 20, description: '20%' },
        { min: 1650000, max: Infinity, rate: 25, description: '25%' }
      ],
      deductionLimits: {
        investments: 1500000,
        insurance: 100000,
        houseRentAllowance: 450000,
        professionalExpenseRate: 0.3
      },
      importantDates: {
        returnDeadline: 'November 30',
        taxCertificateDeadline: 'December 31',
        advanceTaxDeadlines: ['September 15', 'December 15', 'March 15', 'June 15']
      }
    }

    return NextResponse.json({
      success: true,
      data: taxInfo
    })

  } catch (error) {
    console.error('Error fetching tax info:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tax information' },
      { status: 500 }
    )
  }
}