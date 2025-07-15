import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { pdfReportGenerator, ReportData } from '@/lib/pdf/report-generator'
import { TaxScenario, TaxAdvice, taxAdvisorService } from '@/lib/ai/tax-advisor'
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

    // Get user session
    const session = await getServerSession(authOptions)
    
    // Parse request body
    const body = await request.json()
    const { scenario, taxAnalysis, reportType = 'full' } = body

    // Validate required fields
    if (!scenario || !scenario.userType || !scenario.assessmentYear) {
      return NextResponse.json(
        { error: 'Missing required fields: scenario with userType and assessmentYear' },
        { status: 400 }
      )
    }

    // If tax analysis is not provided, calculate it
    let analysis: TaxAdvice
    if (taxAnalysis) {
      analysis = taxAnalysis
    } else {
      try {
        analysis = await taxAdvisorService.analyzeScenario(scenario)
      } catch (error) {
        console.error('Failed to calculate tax analysis for report:', error)
        return NextResponse.json(
          { error: 'Failed to generate tax analysis for report' },
          { status: 500 }
        )
      }
    }

    // Prepare report data
    const reportData: ReportData = {
      userInfo: {
        name: session?.user?.name || undefined,
        email: session?.user?.email || undefined,
        userType: scenario.userType,
        assessmentYear: scenario.assessmentYear,
        location: scenario.location
      },
      taxAnalysis: analysis,
      scenario: scenario,
      generatedAt: new Date().toISOString(),
      reportId: pdfReportGenerator.generateReportId()
    }

    // Generate the report
    const reportBase64 = await pdfReportGenerator.generateTaxReport(reportData)

    // Log report generation for analytics
    if (session?.user?.email) {
      console.log(`Tax report generated for ${session.user.email}:`, {
        reportId: reportData.reportId,
        userType: scenario.userType,
        potentialSavings: analysis.potentialSavings,
        timestamp: reportData.generatedAt
      })
    }

    // Return the report
    return NextResponse.json({
      success: true,
      data: {
        reportId: reportData.reportId,
        reportBase64,
        filename: `tax-report-${reportData.reportId}.html`,
        generatedAt: reportData.generatedAt,
        summary: {
          currentTax: analysis.currentTax,
          optimizedTax: analysis.optimizedTax,
          potentialSavings: analysis.potentialSavings,
          recommendationsCount: analysis.recommendations.length
        }
      },
      metadata: {
        userAuthenticated: !!session,
        reportType,
        rateLimit: {
          remaining,
          reset: reset.getTime()
        }
      }
    })

  } catch (error) {
    console.error('Report generation error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to generate report. Please try again.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  // Return report templates and options
  try {
    const session = await getServerSession(authOptions)
    
    const reportInfo = {
      availableTemplates: [
        {
          id: 'full',
          name: 'Complete Tax Analysis Report',
          description: 'Comprehensive report with all recommendations, warnings, and next steps',
          features: [
            'Complete tax analysis',
            'Optimization recommendations',
            'Legal citations',
            'Implementation roadmap',
            'Professional disclaimers'
          ]
        },
        {
          id: 'summary',
          name: 'Tax Summary Report',
          description: 'Concise summary with key findings and top recommendations',
          features: [
            'Tax liability summary',
            'Top 3 recommendations',
            'Potential savings',
            'Quick action items'
          ]
        }
      ],
      formats: [
        { id: 'html', name: 'HTML Report', description: 'Web-optimized report for viewing and printing' },
        { id: 'pdf', name: 'PDF Report', description: 'Professional PDF document (Premium feature)' }
      ],
      pricing: {
        free: {
          reportsPerMonth: 3,
          templatesIncluded: ['summary'],
          formats: ['html']
        },
        pro: {
          reportsPerMonth: 20,
          templatesIncluded: ['full', 'summary'],
          formats: ['html', 'pdf']
        },
        business: {
          reportsPerMonth: -1, // unlimited
          templatesIncluded: ['full', 'summary'],
          formats: ['html', 'pdf'],
          customBranding: true
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: reportInfo,
      user: {
        authenticated: !!session,
        plan: 'free' // TODO: Get actual user plan from subscription system
      }
    })

  } catch (error) {
    console.error('Error fetching report info:', error)
    return NextResponse.json(
      { error: 'Failed to fetch report information' },
      { status: 500 }
    )
  }
}