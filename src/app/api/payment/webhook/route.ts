import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import { Payment, Subscription } from '@/lib/db/models';

export async function POST(request: NextRequest) {
  try {
    // Verify webhook authenticity (implement based on bKash documentation)
    const webhookPayload = await request.json();
    const { paymentID, transactionStatus, trxID } = webhookPayload;

    if (!paymentID) {
      return NextResponse.json(
        { error: 'Invalid webhook payload' },
        { status: 400 }
      );
    }

    await connectDB();

    // Find the payment record
    const payment = await Payment.findOne({
      gatewayPaymentId: paymentID
    });

    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    // Only process if payment is still pending or processing
    if (!['pending', 'processing'].includes(payment.status)) {
      return NextResponse.json(
        { message: 'Payment already processed' },
        { status: 200 }
      );
    }

    if (transactionStatus === 'Completed' && trxID) {
      // Payment completed successfully
      payment.status = 'completed';
      payment.gatewayTransactionId = trxID;
      payment.paymentDate = new Date();
      payment.metadata.gatewayResponse = webhookPayload;
      await payment.save();

      // Activate subscription
      const existingSubscription = await Subscription.findOne({
        userId: payment.userId,
        status: { $in: ['active', 'pending'] }
      });

      if (existingSubscription) {
        existingSubscription.planType = payment.planType;
        existingSubscription.status = 'active';
        existingSubscription.startDate = new Date();
        existingSubscription.endDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
        existingSubscription.paymentMethod = 'bkash';
        existingSubscription.amount = payment.amount;
        await existingSubscription.save();
      } else {
        const subscription = new Subscription({
          userId: payment.userId,
          planType: payment.planType,
          status: 'active',
          startDate: new Date(),
          endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          paymentMethod: 'bkash',
          amount: payment.amount
        });
        await subscription.save();
        
        payment.subscriptionId = subscription._id;
        await payment.save();
      }

    } else if (transactionStatus === 'Failed' || transactionStatus === 'Cancelled') {
      // Payment failed or cancelled
      payment.status = transactionStatus.toLowerCase() as 'failed' | 'cancelled';
      payment.failureReason = `Payment ${transactionStatus.toLowerCase()} via webhook`;
      payment.metadata.gatewayResponse = webhookPayload;
      await payment.save();
    }

    return NextResponse.json({ message: 'Webhook processed successfully' });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}