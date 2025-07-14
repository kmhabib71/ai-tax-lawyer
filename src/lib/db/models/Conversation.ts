import mongoose, { Document, Schema } from 'mongoose'

export interface IMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  metadata?: {
    sources?: string[]
    confidence?: number
    citations?: string[]
    tokens?: number
  }
}

export interface IConversation extends Document {
  userId: mongoose.Types.ObjectId
  title: string
  category: 'tax_consultation' | 'deduction_finder' | 'calculation' | 'general'
  status: 'active' | 'completed' | 'archived'
  messages: IMessage[]
  summary?: string
  tags: string[]
  metadata: {
    userType: string
    totalTokens: number
    totalCost: number
    sources: string[]
    confidence: number
  }
  createdAt: Date
  updatedAt: Date
}

const MessageSchema = new Schema<IMessage>({
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  metadata: {
    sources: [String],
    confidence: {
      type: Number,
      min: 0,
      max: 1
    },
    citations: [String],
    tokens: Number
  }
}, { _id: false })

const ConversationSchema = new Schema<IConversation>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  category: {
    type: String,
    enum: ['tax_consultation', 'deduction_finder', 'calculation', 'general'],
    default: 'general'
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'archived'],
    default: 'active'
  },
  messages: [MessageSchema],
  summary: {
    type: String,
    maxlength: 1000
  },
  tags: [String],
  metadata: {
    userType: {
      type: String,
      default: 'unknown'
    },
    totalTokens: {
      type: Number,
      default: 0
    },
    totalCost: {
      type: Number,
      default: 0
    },
    sources: [String],
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 0
    }
  }
}, {
  timestamps: true
})

// Create indexes for better performance
ConversationSchema.index({ userId: 1, createdAt: -1 })
ConversationSchema.index({ category: 1 })
ConversationSchema.index({ status: 1 })
ConversationSchema.index({ tags: 1 })
ConversationSchema.index({ 'metadata.userType': 1 })

export default mongoose.models.Conversation || mongoose.model<IConversation>('Conversation', ConversationSchema)