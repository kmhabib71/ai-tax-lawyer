import connectDB from '@/lib/db/connection';
import { Subscription, Payment, ISubscription } from '@/lib/db/models';

export interface PlanFeatures {
  maxQueriesPerMonth: number;
  advancedCalculator: boolean;
  pdfReports: boolean;
  prioritySupport: boolean;
  bengaliSupport: boolean;
  businessFeatures: boolean;
  price: number;
  name: string;
  description: string;
}

export interface UsageStats {
  queriesThisMonth: number;
  queriesRemaining: number;
  resetDate: Date;
}

export class SubscriptionManager {
  static readonly PLANS: Record<string, PlanFeatures> = {
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

  static getPlanFeatures(planType: string): PlanFeatures {
    return this.PLANS[planType] || this.PLANS.free;
  }

  static getAllPlans(): PlanFeatures[] {
    return Object.values(this.PLANS);
  }

  static async getUserSubscription(userId: string): Promise<ISubscription | null> {
    await connectDB();
    
    const subscription = await Subscription.findOne({
      userId,
      status: 'active'
    }).sort({ createdAt: -1 });

    // Check if subscription is expired
    if (subscription && !subscription.isActive()) {
      subscription.status = 'expired';
      await subscription.save();
      return null;
    }

    return subscription;
  }

  static async getUserPlan(userId: string): Promise<{ planType: string; features: PlanFeatures; subscription: ISubscription | null }> {
    const subscription = await this.getUserSubscription(userId);
    
    if (!subscription) {
      return {
        planType: 'free',
        features: this.getPlanFeatures('free'),
        subscription: null
      };
    }

    return {
      planType: subscription.planType,
      features: this.getPlanFeatures(subscription.planType),
      subscription
    };
  }

  static async canUseFeature(userId: string, feature: keyof PlanFeatures): Promise<boolean> {
    const { features } = await this.getUserPlan(userId);
    return !!features[feature];
  }

  static async getRemainingQueries(userId: string): Promise<number> {
    const { features } = await this.getUserPlan(userId);
    const usage = await this.getUsageStats(userId);
    
    return Math.max(0, features.maxQueriesPerMonth - usage.queriesThisMonth);
  }

  static async getUsageStats(userId: string): Promise<UsageStats> {
    await connectDB();
    
    // Get start of current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    // Count queries this month (this would be from conversation/usage logs)
    // For now, returning mock data - implement based on your chat/query logging
    const queriesThisMonth = 0; // TODO: Implement actual query counting
    
    const { features } = await this.getUserPlan(userId);
    
    return {
      queriesThisMonth,
      queriesRemaining: Math.max(0, features.maxQueriesPerMonth - queriesThisMonth),
      resetDate: new Date(now.getFullYear(), now.getMonth() + 1, 1)
    };
  }

  static async upgradeSubscription(userId: string, newPlanType: string): Promise<{ success: boolean; message: string; requiredPayment?: number }> {
    const currentPlan = await this.getUserPlan(userId);
    const newFeatures = this.getPlanFeatures(newPlanType);
    
    if (newPlanType === 'free') {
      return { success: false, message: 'Cannot downgrade to free plan directly' };
    }

    if (currentPlan.planType === newPlanType) {
      return { success: false, message: 'Already subscribed to this plan' };
    }

    // If upgrading from free or expired subscription
    if (!currentPlan.subscription || currentPlan.planType === 'free') {
      return {
        success: false,
        message: 'Payment required for plan upgrade',
        requiredPayment: newFeatures.price
      };
    }

    // Calculate prorated amount for immediate upgrade
    const currentFeatures = this.getPlanFeatures(currentPlan.planType);
    const priceDifference = newFeatures.price - currentFeatures.price;
    
    if (priceDifference > 0) {
      return {
        success: false,
        message: 'Additional payment required for plan upgrade',
        requiredPayment: priceDifference
      };
    }

    // Downgrade case (business to pro)
    currentPlan.subscription.planType = newPlanType as any;
    currentPlan.subscription.features = newFeatures as any;
    await currentPlan.subscription.save();

    return { success: true, message: 'Plan downgraded successfully' };
  }

  static async cancelSubscription(userId: string): Promise<{ success: boolean; message: string }> {
    const subscription = await this.getUserSubscription(userId);
    
    if (!subscription) {
      return { success: false, message: 'No active subscription found' };
    }

    subscription.status = 'cancelled';
    subscription.autoRenew = false;
    await subscription.save();

    return { success: true, message: 'Subscription cancelled successfully' };
  }

  static async renewSubscription(userId: string): Promise<{ success: boolean; message: string; requiredPayment?: number }> {
    const { planType, features } = await this.getUserPlan(userId);
    
    if (planType === 'free') {
      return { success: false, message: 'Free plan does not require renewal' };
    }

    return {
      success: false,
      message: 'Payment required for subscription renewal',
      requiredPayment: features.price
    };
  }

  static async getPaymentHistory(userId: string): Promise<any[]> {
    await connectDB();
    
    const payments = await Payment.find({
      userId,
      status: { $in: ['completed', 'refunded'] }
    }).sort({ createdAt: -1 });

    return payments.map(payment => ({
      id: payment._id,
      amount: payment.amount,
      currency: payment.currency,
      planType: payment.planType,
      paymentMethod: payment.paymentMethod,
      status: payment.status,
      paymentDate: payment.paymentDate,
      merchantInvoiceNumber: payment.merchantInvoiceNumber,
      gatewayTransactionId: payment.gatewayTransactionId
    }));
  }

  static async getSubscriptionAnalytics(): Promise<any> {
    await connectDB();
    
    const analytics = await Subscription.aggregate([
      {
        $group: {
          _id: '$planType',
          count: { $sum: 1 },
          revenue: { $sum: '$amount' },
          activeSubscriptions: {
            $sum: {
              $cond: [{ $eq: ['$status', 'active'] }, 1, 0]
            }
          }
        }
      }
    ]);

    return analytics;
  }
}

// Middleware function to check subscription limits
export async function checkSubscriptionLimits(userId: string, feature: keyof PlanFeatures): Promise<{ allowed: boolean; message?: string }> {
  try {
    const canUse = await SubscriptionManager.canUseFeature(userId, feature);
    
    if (!canUse) {
      const { planType } = await SubscriptionManager.getUserPlan(userId);
      return {
        allowed: false,
        message: `This feature is not available in your ${planType} plan. Please upgrade to access this feature.`
      };
    }

    // Special check for query limits
    if (feature === 'maxQueriesPerMonth') {
      const remaining = await SubscriptionManager.getRemainingQueries(userId);
      if (remaining <= 0) {
        return {
          allowed: false,
          message: 'You have reached your monthly query limit. Please upgrade your plan or wait for next month.'
        };
      }
    }

    return { allowed: true };
  } catch (error) {
    console.error('Subscription check error:', error);
    return {
      allowed: false,
      message: 'Unable to verify subscription. Please try again.'
    };
  }
}