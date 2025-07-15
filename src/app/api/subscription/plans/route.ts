import { NextRequest, NextResponse } from 'next/server';
import { SubscriptionManager } from '@/lib/subscription/manager';

export async function GET(request: NextRequest) {
  try {
    const plans = SubscriptionManager.getAllPlans();
    
    return NextResponse.json({
      plans: plans.map((plan, index) => ({
        ...plan,
        id: Object.keys(SubscriptionManager.PLANS)[index],
        features: [
          `${plan.maxQueriesPerMonth} queries per month`,
          ...(plan.advancedCalculator ? ['Advanced tax calculator'] : []),
          ...(plan.pdfReports ? ['PDF report generation'] : []),
          ...(plan.bengaliSupport ? ['Bengali language support'] : []),
          ...(plan.prioritySupport ? ['Priority customer support'] : []),
          ...(plan.businessFeatures ? ['Business tax features', 'API access', 'White-label options'] : [])
        ]
      }))
    });

  } catch (error) {
    console.error('Plans fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch plans' },
      { status: 500 }
    );
  }
}