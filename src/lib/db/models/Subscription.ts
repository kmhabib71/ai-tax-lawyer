import mongoose, { Schema, Document } from 'mongoose';

export interface ISubscription extends Document {
  _id: string;
  userId: string;
  planType: 'free' | 'pro' | 'business';
  status: 'active' | 'cancelled' | 'expired' | 'pending';
  startDate: Date;
  endDate: Date;
  autoRenew: boolean;
  paymentMethod: 'bkash' | 'nagad' | 'card';
  amount: number;
  currency: string;
  features: {
    maxQueriesPerMonth: number;
    advancedCalculator: boolean;
    pdfReports: boolean;
    prioritySupport: boolean;
    bengaliSupport: boolean;
    businessFeatures: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionSchema = new Schema<ISubscription>({
  userId: {
    type: String,
    required: true,
    index: true
  },
  planType: {
    type: String,
    enum: ['free', 'pro', 'business'],
    required: true,
    default: 'free'
  },
  status: {
    type: String,
    enum: ['active', 'cancelled', 'expired', 'pending'],
    required: true,
    default: 'pending'
  },
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  endDate: {
    type: Date,
    required: true
  },
  autoRenew: {
    type: Boolean,
    default: true
  },
  paymentMethod: {
    type: String,
    enum: ['bkash', 'nagad', 'card'],
    required: function(this: ISubscription) {
      return this.planType !== 'free';
    }
  },
  amount: {
    type: Number,
    required: function(this: ISubscription) {
      return this.planType !== 'free';
    }
  },
  currency: {
    type: String,
    default: 'BDT'
  },
  features: {
    maxQueriesPerMonth: {
      type: Number,
      default: function(this: ISubscription) {
        switch (this.planType) {
          case 'free': return 10;
          case 'pro': return 100;
          case 'business': return 1000;
          default: return 10;
        }
      }
    },
    advancedCalculator: {
      type: Boolean,
      default: function(this: ISubscription) {
        return this.planType !== 'free';
      }
    },
    pdfReports: {
      type: Boolean,
      default: function(this: ISubscription) {
        return this.planType !== 'free';
      }
    },
    prioritySupport: {
      type: Boolean,
      default: function(this: ISubscription) {
        return this.planType === 'business';
      }
    },
    bengaliSupport: {
      type: Boolean,
      default: function(this: ISubscription) {
        return this.planType !== 'free';
      }
    },
    businessFeatures: {
      type: Boolean,
      default: function(this: ISubscription) {
        return this.planType === 'business';
      }
    }
  }
}, {
  timestamps: true
});

// Indexes for performance
SubscriptionSchema.index({ userId: 1, status: 1 });
SubscriptionSchema.index({ endDate: 1, status: 1 });
SubscriptionSchema.index({ planType: 1, status: 1 });

// Static method to get plan features
SubscriptionSchema.statics.getPlanFeatures = function(planType: string) {
  const plans = {
    free: {
      maxQueriesPerMonth: 10,
      advancedCalculator: false,
      pdfReports: false,
      prioritySupport: false,
      bengaliSupport: false,
      businessFeatures: false,
      price: 0,
      name: 'Free Plan',
      description: 'Basic tax calculations for salaried employees'
    },
    pro: {
      maxQueriesPerMonth: 100,
      advancedCalculator: true,
      pdfReports: true,
      prioritySupport: false,
      bengaliSupport: true,
      businessFeatures: false,
      price: 999,
      name: 'Pro Plan',
      description: 'Advanced features for freelancers and landlords'
    },
    business: {
      maxQueriesPerMonth: 1000,
      advancedCalculator: true,
      pdfReports: true,
      prioritySupport: true,
      bengaliSupport: true,
      businessFeatures: true,
      price: 4999,
      name: 'Business Plan',
      description: 'Corporate features for businesses and CAs'
    }
  };
  
  return plans[planType as keyof typeof plans] || plans.free;
};

// Instance method to check if subscription is active
SubscriptionSchema.methods.isActive = function() {
  return this.status === 'active' && new Date() <= this.endDate;
};

// Instance method to check if subscription can use feature
SubscriptionSchema.methods.canUseFeature = function(feature: string) {
  return this.features[feature as keyof typeof this.features] || false;
};

export const Subscription = mongoose.models.Subscription || mongoose.model<ISubscription>('Subscription', SubscriptionSchema);