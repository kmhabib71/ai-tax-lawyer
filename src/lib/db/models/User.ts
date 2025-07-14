import mongoose, { Document, Schema } from 'mongoose'

export interface IUser extends Document {
  email: string
  name: string
  image?: string
  userType: 'salaried' | 'freelancer' | 'landlord' | 'business' | 'other'
  subscriptionTier: 'free' | 'pro' | 'business' | 'enterprise'
  language: 'en' | 'bn'
  notifications: {
    email: boolean
    taxReminders: boolean
    newsletterUpdates: boolean
  }
  preferences: {
    theme: 'light' | 'dark' | 'system'
    currency: 'BDT' | 'USD'
    timezone: string
  }
  profile: {
    phone?: string
    nid?: string
    tin?: string
    occupation?: string
    company?: string
    annualIncome?: number
  }
  createdAt: Date
  updatedAt: Date
  lastActive: Date
}

const UserSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  image: {
    type: String,
    default: null
  },
  userType: {
    type: String,
    enum: ['salaried', 'freelancer', 'landlord', 'business', 'other'],
    default: 'other'
  },
  subscriptionTier: {
    type: String,
    enum: ['free', 'pro', 'business', 'enterprise'],
    default: 'free'
  },
  language: {
    type: String,
    enum: ['en', 'bn'],
    default: 'en'
  },
  notifications: {
    email: {
      type: Boolean,
      default: true
    },
    taxReminders: {
      type: Boolean,
      default: true
    },
    newsletterUpdates: {
      type: Boolean,
      default: false
    }
  },
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'light'
    },
    currency: {
      type: String,
      enum: ['BDT', 'USD'],
      default: 'BDT'
    },
    timezone: {
      type: String,
      default: 'Asia/Dhaka'
    }
  },
  profile: {
    phone: String,
    nid: String,
    tin: String,
    occupation: String,
    company: String,
    annualIncome: Number
  },
  lastActive: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
})

// Create indexes for better performance
UserSchema.index({ email: 1 })
UserSchema.index({ userType: 1 })
UserSchema.index({ subscriptionTier: 1 })
UserSchema.index({ createdAt: -1 })

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema)