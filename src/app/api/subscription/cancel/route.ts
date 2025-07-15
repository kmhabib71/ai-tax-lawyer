import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { SubscriptionManager } from '@/lib/subscription/manager';
import { authOptions } from '@/lib/auth/config';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const result = await SubscriptionManager.cancelSubscription((session.user as any).id);

    return NextResponse.json({
      success: result.success,
      message: result.message
    });

  } catch (error) {
    console.error('Subscription cancellation error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}