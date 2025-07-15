import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/db/connection';
import { Payment, Subscription } from '@/lib/db/models';
import { bkashService } from '@/lib/payments/bkash';
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

    const { planType, billingPeriod = 'yearly' } = await request.json();

    if (!planType || !['pro', 'business'].includes(planType)) {
      return NextResponse.json(
        { error: 'Invalid plan type' },
        { status: 400 }
      );
    }

    await connectDB();

    // Get plan pricing
    const planFeatures = (Subscription as any).getPlanFeatures(planType);
    const amount = planFeatures.price;

    if (amount === 0) {
      return NextResponse.json(
        { error: 'Free plans do not require payment' },
        { status: 400 }
      );
    }

    // Create payment record in database
    const payment = new Payment({
      userId: (session.user as any).id,
      paymentMethod: 'bkash',
      gatewayPaymentId: '', // Will be updated after bKash creation
      merchantInvoiceNumber: `AI-TAX-${planType.toUpperCase()}-${(session.user as any).id}-${Date.now()}`,
      amount,
      currency: 'BDT',
      status: 'pending',
      paymentType: 'subscription',
      planType,
      billingPeriod,
      metadata: {
        userAgent: request.headers.get('user-agent') || '',
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || ''
      }
    });

    // Create bKash payment
    const bkashPayment = await bkashService.createPayment(
      amount,
      planType,
      (session.user as any).id
    );

    // Update payment record with bKash payment ID
    payment.gatewayPaymentId = bkashPayment.paymentID;
    payment.metadata.paymentUrl = bkashPayment.bkashURL;
    payment.metadata.gatewayResponse = bkashPayment;

    await payment.save();

    return NextResponse.json({
      success: true,
      paymentId: payment._id,
      bkashUrl: bkashPayment.bkashURL,
      amount,
      currency: 'BDT',
      planType,
      merchantInvoiceNumber: payment.merchantInvoiceNumber
    });

  } catch (error) {
    console.error('Payment creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create payment' },
      { status: 500 }
    );
  }
}