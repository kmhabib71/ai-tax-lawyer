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

    const { paymentID } = await request.json();

    if (!paymentID) {
      return NextResponse.json(
        { error: 'Payment ID is required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Find payment record
    const payment = await Payment.findOne({
      gatewayPaymentId: paymentID,
      userId: (session.user as any).id,
      status: 'pending'
    });

    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found or already processed' },
        { status: 404 }
      );
    }

    // Execute payment with bKash
    payment.status = 'processing';
    await payment.save();

    try {
      const bkashResult = await bkashService.executePayment(paymentID);
      
      if (bkashResult.transactionStatus === 'Completed') {
        // Payment successful
        payment.status = 'completed';
        payment.gatewayTransactionId = bkashResult.trxID;
        payment.paymentDate = new Date();
        payment.metadata.gatewayResponse = bkashResult;
        await payment.save();

        // Create or update subscription
        const existingSubscription = await Subscription.findOne({
          userId: (session.user as any).id,
          status: { $in: ['active', 'pending'] }
        });

        if (existingSubscription) {
          // Update existing subscription
          existingSubscription.planType = payment.planType;
          existingSubscription.status = 'active';
          existingSubscription.startDate = new Date();
          existingSubscription.endDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year
          existingSubscription.paymentMethod = 'bkash';
          existingSubscription.amount = payment.amount;
          existingSubscription.features = (Subscription as any).getPlanFeatures(payment.planType);
          await existingSubscription.save();
        } else {
          // Create new subscription
          const subscription = new Subscription({
            userId: (session.user as any).id,
            planType: payment.planType,
            status: 'active',
            startDate: new Date(),
            endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
            paymentMethod: 'bkash',
            amount: payment.amount,
            features: (Subscription as any).getPlanFeatures(payment.planType)
          });
          await subscription.save();
          
          // Update payment with subscription ID
          payment.subscriptionId = subscription._id;
          await payment.save();
        }

        return NextResponse.json({
          success: true,
          transactionId: bkashResult.trxID,
          amount: bkashResult.amount,
          planType: payment.planType,
          subscriptionStatus: 'active'
        });

      } else {
        // Payment failed
        payment.status = 'failed';
        payment.failureReason = `bKash execution failed: ${bkashResult.transactionStatus}`;
        payment.metadata.gatewayResponse = bkashResult;
        await payment.save();

        return NextResponse.json(
          { error: 'Payment execution failed' },
          { status: 400 }
        );
      }

    } catch (bkashError) {
      // bKash API error
      payment.status = 'failed';
      payment.failureReason = bkashError instanceof Error ? bkashError.message : 'Unknown bKash error';
      await payment.save();

      return NextResponse.json(
        { error: 'Payment processing failed' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Payment execution error:', error);
    return NextResponse.json(
      { error: 'Failed to execute payment' },
      { status: 500 }
    );
  }
}