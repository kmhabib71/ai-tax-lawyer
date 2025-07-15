import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/db/connection';
import { Subscription } from '@/lib/db/models';
import { authOptions } from '@/lib/auth/config';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    await connectDB();

    // Find user's current subscription
    const subscription = await Subscription.findOne({
      userId: (session.user as any).id,
      status: 'active'
    }).sort({ createdAt: -1 });

    if (!subscription) {
      // User has no active subscription, return free plan
      return NextResponse.json({
        planType: 'free',
        status: 'active',
        features: (Subscription as any).getPlanFeatures('free'),
        isActive: true,
        daysRemaining: null,
        endDate: null
      });
    }

    // Check if subscription is still active
    const isActive = subscription.isActive();
    const daysRemaining = isActive 
      ? Math.ceil((subscription.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : 0;

    // If subscription expired, mark it as expired
    if (!isActive && subscription.status === 'active') {
      subscription.status = 'expired';
      await subscription.save();
    }

    return NextResponse.json({
      planType: subscription.planType,
      status: subscription.status,
      features: subscription.features,
      isActive,
      daysRemaining,
      endDate: subscription.endDate,
      startDate: subscription.startDate,
      autoRenew: subscription.autoRenew,
      paymentMethod: subscription.paymentMethod,
      amount: subscription.amount
    });

  } catch (error) {
    console.error('Subscription status error:', error);
    return NextResponse.json(
      { error: 'Failed to get subscription status' },
      { status: 500 }
    );
  }
}