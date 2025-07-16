import mongoose, { Schema, Document } from 'mongoose'

export interface IAuditLog extends Document {
  userId: string
  sessionId: string
  action: 'chat_message' | 'tax_calculation' | 'report_generation' | 'login' | 'logout' | 'profile_update' | 'payment' | 'subscription_change'
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
  metadata: {
    tokens?: number
    cost?: number
    confidence?: number
    model?: string
    processingTime?: number
    sources?: string[]
    citations?: string[]
  }
  compliance: {
    dataClassification: 'public' | 'internal' | 'confidential' | 'restricted'
    retentionPeriod: number // in days
    legalBasis?: string
    consentGiven: boolean
  }
  timestamp: Date
  createdAt: Date
  updatedAt: Date
}

export interface IAuditLogModel extends mongoose.Model<IAuditLog> {
  cleanExpiredLogs(): Promise<any>
  getComplianceReport(startDate: Date, endDate: Date): Promise<any[]>
}

const AuditLogSchema = new Schema<IAuditLog>({
  userId: {
    type: String,
    required: true,
    index: true
  },
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  action: {
    type: String,
    required: true,
    enum: ['chat_message', 'tax_calculation', 'report_generation', 'login', 'logout', 'profile_update', 'payment', 'subscription_change'],
    index: true
  },
  details: {
    userMessage: String,
    aiResponse: String,
    userType: String,
    calculationInputs: Schema.Types.Mixed,
    calculationResults: Schema.Types.Mixed,
    reportType: String,
    paymentAmount: Number,
    subscriptionPlan: String,
    ipAddress: {
      type: String,
      required: true
    },
    userAgent: {
      type: String,
      required: true
    },
    language: {
      type: String,
      default: 'en'
    }
  },
  metadata: {
    tokens: Number,
    cost: Number,
    confidence: Number,
    model: String,
    processingTime: Number,
    sources: [String],
    citations: [String]
  },
  compliance: {
    dataClassification: {
      type: String,
      required: true,
      enum: ['public', 'internal', 'confidential', 'restricted'],
      default: 'confidential'
    },
    retentionPeriod: {
      type: Number,
      required: true,
      default: 2555 // 7 years in days
    },
    legalBasis: String,
    consentGiven: {
      type: Boolean,
      required: true,
      default: false
    }
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true,
  collection: 'audit_logs'
})

// Indexes for efficient querying
AuditLogSchema.index({ userId: 1, timestamp: -1 })
AuditLogSchema.index({ action: 1, timestamp: -1 })
AuditLogSchema.index({ 'compliance.dataClassification': 1 })
AuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 365 * 7 }) // 7 years TTL

// Virtual for anonymized version
AuditLogSchema.virtual('anonymized').get(function() {
  const anonymized = this.toObject()
  
  // Remove or hash sensitive information
  if (anonymized.details.userMessage) {
    anonymized.details.userMessage = '[REDACTED]'
  }
  if (anonymized.details.aiResponse) {
    anonymized.details.aiResponse = '[REDACTED]'
  }
  if (anonymized.details.calculationInputs) {
    anonymized.details.calculationInputs = '[REDACTED]' as any
  }
  if (anonymized.details.ipAddress) {
    // Keep only first 3 octets
    const ipParts = anonymized.details.ipAddress.split('.')
    if (ipParts.length >= 3) {
      anonymized.details.ipAddress = `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}.xxx`
    }
  }
  
  return anonymized
})

// Static method to clean expired logs
AuditLogSchema.statics.cleanExpiredLogs = async function() {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - 2555) // 7 years ago
  
  const result = await this.deleteMany({
    createdAt: { $lt: cutoffDate }
  })
  
  return result
}

// Static method to get compliance report
AuditLogSchema.statics.getComplianceReport = async function(startDate: Date, endDate: Date) {
  const pipeline: any[] = [
    {
      $match: {
        timestamp: {
          $gte: startDate,
          $lte: endDate
        }
      }
    },
    {
      $group: {
        _id: {
          action: '$action',
          dataClassification: '$compliance.dataClassification'
        },
        count: { $sum: 1 },
        totalCost: { $sum: '$metadata.cost' },
        totalTokens: { $sum: '$metadata.tokens' },
        uniqueUsers: { $addToSet: '$userId' }
      }
    },
    {
      $project: {
        action: '$_id.action',
        dataClassification: '$_id.dataClassification',
        count: 1,
        totalCost: 1,
        totalTokens: 1,
        uniqueUserCount: { $size: '$uniqueUsers' }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]
  
  return await this.aggregate(pipeline)
}

// Pre-save middleware to ensure compliance
AuditLogSchema.pre('save', function(next) {
  // Set data classification based on action
  if (this.action === 'chat_message' || this.action === 'tax_calculation') {
    this.compliance.dataClassification = 'confidential'
  } else if (this.action === 'payment') {
    this.compliance.dataClassification = 'restricted'
  } else {
    this.compliance.dataClassification = 'internal'
  }
  
  next()
})

export default (mongoose.models.AuditLog as IAuditLogModel) || mongoose.model<IAuditLog, IAuditLogModel>('AuditLog', AuditLogSchema)