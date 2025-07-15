import mongoose, { Schema, Document } from 'mongoose';

export interface IPayment extends Document {
  _id: string;
  userId: string;
  subscriptionId?: string;
  paymentMethod: 'bkash' | 'nagad' | 'card';
  gatewayPaymentId: string; // bKash paymentID, etc.
  gatewayTransactionId?: string; // bKash trxID, etc.
  merchantInvoiceNumber: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded';
  paymentType: 'subscription' | 'upgrade' | 'renewal';
  planType: 'pro' | 'business';
  billingPeriod: 'monthly' | 'yearly';
  paymentDate?: Date;
  failureReason?: string;
  refundAmount?: number;
  refundDate?: Date;
  refundReason?: string;
  metadata: {
    userAgent?: string;
    ipAddress?: string;
    paymentUrl?: string;
    gatewayResponse?: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>({
  userId: {
    type: String,
    required: true,
    index: true
  },
  subscriptionId: {
    type: String,
    index: true
  },
  paymentMethod: {
    type: String,
    enum: ['bkash', 'nagad', 'card'],
    required: true
  },
  gatewayPaymentId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  gatewayTransactionId: {
    type: String,
    index: true
  },
  merchantInvoiceNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    required: true,
    default: 'BDT'
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'],
    required: true,
    default: 'pending',
    index: true
  },
  paymentType: {
    type: String,
    enum: ['subscription', 'upgrade', 'renewal'],
    required: true
  },
  planType: {
    type: String,
    enum: ['pro', 'business'],
    required: true
  },
  billingPeriod: {
    type: String,
    enum: ['monthly', 'yearly'],
    required: true,
    default: 'yearly'
  },
  paymentDate: {
    type: Date
  },
  failureReason: {
    type: String
  },
  refundAmount: {
    type: Number,
    min: 0
  },
  refundDate: {
    type: Date
  },
  refundReason: {
    type: String
  },
  metadata: {
    userAgent: String,
    ipAddress: String,
    paymentUrl: String,
    gatewayResponse: Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Indexes for performance and reporting
PaymentSchema.index({ userId: 1, status: 1 });
PaymentSchema.index({ paymentMethod: 1, status: 1 });
PaymentSchema.index({ planType: 1, createdAt: -1 });
PaymentSchema.index({ status: 1, createdAt: -1 });
PaymentSchema.index({ merchantInvoiceNumber: 1 }, { unique: true });

// Static method to get payment statistics
PaymentSchema.statics.getPaymentStats = async function(userId?: string) {
  const matchStage = userId ? { userId } : {};
  
  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0] } },
        totalPayments: { $sum: 1 },
        successfulPayments: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        failedPayments: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
        pendingPayments: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
        refundedAmount: { $sum: { $cond: [{ $eq: ['$status', 'refunded'] }, '$refundAmount', 0] } }
      }
    }
  ]);
  
  return stats[0] || {
    totalRevenue: 0,
    totalPayments: 0,
    successfulPayments: 0,
    failedPayments: 0,
    pendingPayments: 0,
    refundedAmount: 0
  };
};

// Instance method to check if payment can be refunded
PaymentSchema.methods.canRefund = function() {
  return this.status === 'completed' && 
         !this.refundAmount && 
         (Date.now() - this.paymentDate.getTime()) < (30 * 24 * 60 * 60 * 1000); // 30 days
};

// Instance method to process refund
PaymentSchema.methods.processRefund = function(amount: number, reason: string) {
  this.status = 'refunded';
  this.refundAmount = amount;
  this.refundDate = new Date();
  this.refundReason = reason;
  return this.save();
};

export const Payment = mongoose.models.Payment || mongoose.model<IPayment>('Payment', PaymentSchema);