import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { auditLogger } from '@/lib/audit/logger'
import connectDB from '@/lib/db/connection'

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const action = searchParams.get('action')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Only allow users to access their own audit logs
    // Admin functionality could be added here
    const options: any = {
      limit,
      offset
    }

    if (startDate) {
      options.startDate = new Date(startDate)
    }
    if (endDate) {
      options.endDate = new Date(endDate)
    }
    if (action) {
      options.action = action
    }

    const auditLogs = await auditLogger.getUserAuditLogs(session.user.email || 'unknown', options)
    
    // Remove sensitive information from response
    const sanitizedLogs = auditLogs.map(log => ({
      id: log._id,
      action: log.action,
      timestamp: log.timestamp,
      metadata: {
        tokens: log.metadata?.tokens,
        cost: log.metadata?.cost,
        confidence: log.metadata?.confidence,
        model: log.metadata?.model,
        processingTime: log.metadata?.processingTime,
        sources: log.metadata?.sources?.length,
        citations: log.metadata?.citations?.length
      },
      compliance: {
        dataClassification: log.compliance.dataClassification,
        consentGiven: log.compliance.consentGiven
      }
    }))

    return NextResponse.json({
      success: true,
      data: sanitizedLogs,
      pagination: {
        limit,
        offset,
        total: auditLogs.length
      }
    })

  } catch (error) {
    console.error('Error fetching audit report:', error)
    return NextResponse.json(
      { error: 'Failed to fetch audit report' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { action, startDate, endDate } = await request.json()

    if (action === 'compliance_report') {
      const start = new Date(startDate)
      const end = new Date(endDate)
      
      const complianceReport = await auditLogger.getComplianceReport(start, end)
      
      return NextResponse.json({
        success: true,
        data: complianceReport
      })
    }

    if (action === 'anonymized_analytics') {
      const start = startDate ? new Date(startDate) : undefined
      const end = endDate ? new Date(endDate) : undefined
      
      const analyticsData = await auditLogger.getAnonymizedLogs({
        startDate: start,
        endDate: end,
        limit: 1000
      })
      
      return NextResponse.json({
        success: true,
        data: analyticsData
      })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Error processing audit report request:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}