import AuditLog, { IAuditLog, IAuditLogModel } from '@/lib/db/models/AuditLog'
import { randomUUID } from 'crypto'

export interface AuditLogEntry {
  userId: string
  sessionId?: string
  action: IAuditLog['action']
  details: {
    userMessage?: string
    aiResponse?: string
    userType?: string
    calculationInputs?: Record<string, any>
    calculationResults?: Record<string, any>
    reportType?: string
    paymentAmount?: number
    subscriptionPlan?: string
    ipAddress: string
    userAgent: string
    language?: string
  }
  metadata?: {
    tokens?: number
    cost?: number
    confidence?: number
    model?: string
    processingTime?: number
    sources?: string[]
    citations?: string[]
  }
  compliance?: {
    dataClassification?: IAuditLog['compliance']['dataClassification']
    retentionPeriod?: number
    legalBasis?: string
    consentGiven?: boolean
  }
}

export class AuditLogger {
  private static instance: AuditLogger
  private sessionCache = new Map<string, string>() // userId -> sessionId

  private constructor() {}

  static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger()
    }
    return AuditLogger.instance
  }

  /**
   * Get or create a session ID for a user
   */
  private getSessionId(userId: string): string {
    if (!this.sessionCache.has(userId)) {
      this.sessionCache.set(userId, randomUUID())
    }
    return this.sessionCache.get(userId)!
  }

  /**
   * Create a new session for a user (e.g., on login)
   */
  createSession(userId: string): string {
    const sessionId = randomUUID()
    this.sessionCache.set(userId, sessionId)
    return sessionId
  }

  /**
   * End a session for a user (e.g., on logout)
   */
  endSession(userId: string): void {
    this.sessionCache.delete(userId)
  }

  /**
   * Log an audit event
   */
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      const sessionId = entry.sessionId || this.getSessionId(entry.userId)
      
      const auditLog = new AuditLog({
        userId: entry.userId,
        sessionId,
        action: entry.action,
        details: entry.details,
        metadata: entry.metadata || {},
        compliance: {
          dataClassification: entry.compliance?.dataClassification || 'confidential',
          retentionPeriod: entry.compliance?.retentionPeriod || 2555, // 7 years
          legalBasis: entry.compliance?.legalBasis || 'Legitimate Interest',
          consentGiven: entry.compliance?.consentGiven || false
        },
        timestamp: new Date()
      })

      await auditLog.save()
    } catch (error) {
      console.error('Failed to save audit log:', error)
      // In production, you might want to send this to a separate logging service
      // to ensure audit logs are not lost
    }
  }

  /**
   * Log AI chat interaction
   */
  async logChatMessage(
    userId: string,
    userMessage: string,
    aiResponse: string,
    metadata: {
      tokens?: number
      cost?: number
      confidence?: number
      model?: string
      processingTime?: number
      sources?: string[]
      citations?: string[]
      userType?: string
      language?: string
      ipAddress: string
      userAgent: string
    }
  ): Promise<void> {
    await this.log({
      userId,
      action: 'chat_message',
      details: {
        userMessage,
        aiResponse,
        userType: metadata.userType,
        language: metadata.language,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent
      },
      metadata: {
        tokens: metadata.tokens,
        cost: metadata.cost,
        confidence: metadata.confidence,
        model: metadata.model,
        processingTime: metadata.processingTime,
        sources: metadata.sources,
        citations: metadata.citations
      },
      compliance: {
        dataClassification: 'confidential',
        consentGiven: true
      }
    })
  }

  /**
   * Log tax calculation
   */
  async logTaxCalculation(
    userId: string,
    inputs: Record<string, any>,
    results: Record<string, any>,
    metadata: {
      userType?: string
      processingTime?: number
      ipAddress: string
      userAgent: string
    }
  ): Promise<void> {
    await this.log({
      userId,
      action: 'tax_calculation',
      details: {
        calculationInputs: inputs,
        calculationResults: results,
        userType: metadata.userType,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent
      },
      metadata: {
        processingTime: metadata.processingTime
      },
      compliance: {
        dataClassification: 'confidential',
        consentGiven: true
      }
    })
  }

  /**
   * Log report generation
   */
  async logReportGeneration(
    userId: string,
    reportType: string,
    metadata: {
      processingTime?: number
      ipAddress: string
      userAgent: string
    }
  ): Promise<void> {
    await this.log({
      userId,
      action: 'report_generation',
      details: {
        reportType,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent
      },
      metadata: {
        processingTime: metadata.processingTime
      },
      compliance: {
        dataClassification: 'confidential',
        consentGiven: true
      }
    })
  }

  /**
   * Log user authentication
   */
  async logAuthentication(
    userId: string,
    action: 'login' | 'logout',
    ipAddress: string,
    userAgent: string
  ): Promise<void> {
    if (action === 'login') {
      this.createSession(userId)
    } else {
      this.endSession(userId)
    }

    await this.log({
      userId,
      action,
      details: {
        ipAddress,
        userAgent
      },
      compliance: {
        dataClassification: 'internal',
        consentGiven: true
      }
    })
  }

  /**
   * Log payment transaction
   */
  async logPayment(
    userId: string,
    amount: number,
    subscriptionPlan: string,
    metadata: {
      ipAddress: string
      userAgent: string
    }
  ): Promise<void> {
    await this.log({
      userId,
      action: 'payment',
      details: {
        paymentAmount: amount,
        subscriptionPlan,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent
      },
      compliance: {
        dataClassification: 'restricted',
        retentionPeriod: 2555, // 7 years for financial records
        legalBasis: 'Legal Obligation',
        consentGiven: true
      }
    })
  }

  /**
   * Get audit logs for a user
   */
  async getUserAuditLogs(
    userId: string,
    options: {
      startDate?: Date
      endDate?: Date
      action?: IAuditLog['action']
      limit?: number
      offset?: number
    } = {}
  ): Promise<IAuditLog[]> {
    const query: any = { userId }
    
    if (options.startDate || options.endDate) {
      query.timestamp = {}
      if (options.startDate) query.timestamp.$gte = options.startDate
      if (options.endDate) query.timestamp.$lte = options.endDate
    }
    
    if (options.action) {
      query.action = options.action
    }

    return await AuditLog.find(query)
      .sort({ timestamp: -1 })
      .limit(options.limit || 100)
      .skip(options.offset || 0)
      .exec()
  }

  /**
   * Get compliance report
   */
  async getComplianceReport(startDate: Date, endDate: Date): Promise<any[]> {
    return await (AuditLog as IAuditLogModel).getComplianceReport(startDate, endDate)
  }

  /**
   * Clean expired logs (should be run periodically)
   */
  async cleanExpiredLogs(): Promise<any> {
    return await (AuditLog as IAuditLogModel).cleanExpiredLogs()
  }

  /**
   * Get anonymized logs for analytics
   */
  async getAnonymizedLogs(
    options: {
      startDate?: Date
      endDate?: Date
      action?: IAuditLog['action']
      limit?: number
    } = {}
  ): Promise<any[]> {
    const query: any = {}
    
    if (options.startDate || options.endDate) {
      query.timestamp = {}
      if (options.startDate) query.timestamp.$gte = options.startDate
      if (options.endDate) query.timestamp.$lte = options.endDate
    }
    
    if (options.action) {
      query.action = options.action
    }

    const logs = await AuditLog.find(query)
      .sort({ timestamp: -1 })
      .limit(options.limit || 1000)
      .exec()

    return logs.map(log => (log as any).anonymized)
  }
}

export const auditLogger = AuditLogger.getInstance()