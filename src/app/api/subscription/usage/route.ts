import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { SubscriptionManager } from '@/lib/subscription/manager';
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

    const [usageStats, planInfo] = await Promise.all([
      SubscriptionManager.getUsageStats((session.user as any).id),
      SubscriptionManager.getUserPlan((session.user as any).id)
    ]);

    return NextResponse.json({
      planType: planInfo.planType,
      features: planInfo.features,
      usage: usageStats,
      subscription: planInfo.subscription ? {
        status: planInfo.subscription.status,
        startDate: planInfo.subscription.startDate,
        endDate: planInfo.subscription.endDate,
        autoRenew: planInfo.subscription.autoRenew
      } : null
    });

  } catch (error) {
    console.error('Usage stats error:', error);
    return NextResponse.json(
      { error: 'Failed to get usage statistics' },
      { status: 500 }
    );
  }
}