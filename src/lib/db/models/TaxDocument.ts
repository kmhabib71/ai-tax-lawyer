import mongoose, { Document, Schema } from 'mongoose'

export interface IChunk {
  content: string
  embedding: number[]
  metadata: {
    page?: number
    section?: string
    subsection?: string
    keywords: string[]
  }
}

export interface ITaxDocument extends Document {
  title: string
  type: 'nbr_rule' | 'sro' | 'ordinance' | 'circular' | 'gazette' | 'court_case'
  documentNumber: string
  dateIssued: Date
  dateEffective: Date
  status: 'active' | 'superseded' | 'draft'
  language: 'en' | 'bn' | 'both'
  
  content: {
    originalText: string
    processedText: string
    chunks: IChunk[]
  }
  
  metadata: {
    fileUrl?: string
    fileHash: string
    fileSize: number
    pageCount?: number
    category: string[]
    keywords: string[]
    applicableTo: string[]
    amendments: mongoose.Types.ObjectId[]
    supersedes: mongoose.Types.ObjectId[]
  }
  
  searchVector?: number[]
  version: number
  createdAt: Date
  updatedAt: Date
}

const ChunkSchema = new Schema<IChunk>({
  content: {
    type: String,
    required: true
  },
  embedding: [Number],
  metadata: {
    page: Number,
    section: String,
    subsection: String,
    keywords: [String]
  }
}, { _id: false })

const TaxDocumentSchema = new Schema<ITaxDocument>({
  title: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['nbr_rule', 'sro', 'ordinance', 'circular', 'gazette', 'court_case'],
    required: true
  },
  documentNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  dateIssued: {
    type: Date,
    required: true
  },
  dateEffective: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'superseded', 'draft'],
    default: 'active'
  },
  language: {
    type: String,
    enum: ['en', 'bn', 'both'],
    default: 'en'
  },
  content: {
    originalText: {
      type: String,
      required: true
    },
    processedText: {
      type: String,
      required: true
    },
    chunks: [ChunkSchema]
  },
  metadata: {
    fileUrl: String,
    fileHash: {
      type: String,
      required: true
    },
    fileSize: {
      type: Number,
      required: true
    },
    pageCount: Number,
    category: [String],
    keywords: [String],
    applicableTo: [String],
    amendments: [{
      type: Schema.Types.ObjectId,
      ref: 'TaxDocument'
    }],
    supersedes: [{
      type: Schema.Types.ObjectId,
      ref: 'TaxDocument'
    }]
  },
  searchVector: [Number],
  version: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true
})

// Create indexes for better performance
TaxDocumentSchema.index({ documentNumber: 1 })
TaxDocumentSchema.index({ type: 1, status: 1 })
TaxDocumentSchema.index({ dateEffective: -1 })
TaxDocumentSchema.index({ 'metadata.category': 1 })
TaxDocumentSchema.index({ 'metadata.keywords': 1 })
TaxDocumentSchema.index({ 'metadata.applicableTo': 1 })
TaxDocumentSchema.index({ title: 'text', 'content.processedText': 'text' })

export default mongoose.models.TaxDocument || mongoose.model<ITaxDocument>('TaxDocument', TaxDocumentSchema)