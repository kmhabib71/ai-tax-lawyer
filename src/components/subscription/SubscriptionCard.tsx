'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface UserPlan {
  planType: string;
  features: {
    name: string;
    maxQueriesPerMonth: number;
    price: number;
  };
  usage: {
    queriesThisMonth: number;
    queriesRemaining: number;
    resetDate: string;
  };
  subscription: {
    status: string;
    startDate: string;
    endDate: string;
    autoRenew: boolean;
  } | null;
}

interface PaymentHistory {
  id: string;
  amount: number;
  currency: string;
  planType: string;
  paymentMethod: string;
  status: string;
  paymentDate: string;
  merchantInvoiceNumber: string;
}

export default function SubscriptionCard() {
  const router = useRouter();
  const [planData, setPlanData] = useState<UserPlan | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    fetchPlanData();
    fetchPaymentHistory();
  }, []);

  const fetchPlanData = async () => {
    try {
      const response = await fetch('/api/subscription/usage');
      if (response.ok) {
        const data = await response.json();
        setPlanData(data);
      }
    } catch (error) {
      console.error('Failed to fetch plan data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentHistory = async () => {
    try {
      const response = await fetch('/api/subscription/payments');
      if (response.ok) {
        const data = await response.json();
        setPaymentHistory(data.payments || []);
      }
    } catch (error) {
      console.error('Failed to fetch payment history:', error);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your billing period.')) {
      return;
    }

    setCancelling(true);
    try {
      const response = await fetch('/api/subscription/cancel', {
        method: 'POST'
      });

      const data = await response.json();
      
      if (data.success) {
        alert('Subscription cancelled successfully. You will retain access until the end of your billing period.');
        fetchPlanData();
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error('Cancel subscription error:', error);
      alert('Failed to cancel subscription. Please try again.');
    } finally {
      setCancelling(false);
    }
  };

  const getProgressPercentage = () => {
    if (!planData) return 0;
    const used = planData.usage.queriesThisMonth;
    const total = planData.features.maxQueriesPerMonth;
    return Math.min((used / total) * 100, 100);
  };

  const getProgressColor = () => {
    const percentage = getProgressPercentage();
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-2 bg-gray-200 rounded mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  if (!planData) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center">
          <p className="text-gray-600">Unable to load subscription data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Plan Card */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Current Plan</h3>
            <p className="text-gray-600">Manage your subscription and usage</p>
          </div>
          <div className="text-right">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              planData.planType === 'free' 
                ? 'bg-gray-100 text-gray-800'
                : planData.subscription?.status === 'active'
                ? 'bg-green-100 text-green-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {planData.features.name}
            </span>
          </div>
        </div>

        {/* Plan Details */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Plan Details</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Monthly Price:</span>
                <span className="font-medium">৳{planData.features.price.toLocaleString()}</span>
              </div>
              {planData.subscription && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Started:</span>
                    <span className="font-medium">
                      {new Date(planData.subscription.startDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Expires:</span>
                    <span className="font-medium">
                      {new Date(planData.subscription.endDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Auto-renew:</span>
                    <span className={`font-medium ${planData.subscription.autoRenew ? 'text-green-600' : 'text-red-600'}`}>
                      {planData.subscription.autoRenew ? 'Yes' : 'No'}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-2">Usage This Month</h4>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>{planData.usage.queriesThisMonth} of {planData.features.maxQueriesPerMonth} queries used</span>
                <span>{planData.usage.queriesRemaining} remaining</span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all ${getProgressColor()}`}
                  style={{ width: `${getProgressPercentage()}%` }}
                ></div>
              </div>
              
              <p className="text-xs text-gray-500">
                Resets on {new Date(planData.usage.resetDate).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={() => router.push('/pricing')}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            {planData.planType === 'free' ? 'Upgrade Plan' : 'Change Plan'}
          </button>
          
          {planData.subscription && planData.subscription.status === 'active' && (
            <button
              onClick={handleCancelSubscription}
              disabled={cancelling}
              className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              {cancelling ? 'Cancelling...' : 'Cancel'}
            </button>
          )}
        </div>
      </div>

      {/* Payment History */}
      {paymentHistory.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Payment History</h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Date</th>
                  <th className="text-left py-2">Amount</th>
                  <th className="text-left py-2">Plan</th>
                  <th className="text-left py-2">Method</th>
                  <th className="text-left py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {paymentHistory.map((payment) => (
                  <tr key={payment.id} className="border-b">
                    <td className="py-2">
                      {new Date(payment.paymentDate).toLocaleDateString()}
                    </td>
                    <td className="py-2">
                      ৳{payment.amount.toLocaleString()} {payment.currency}
                    </td>
                    <td className="py-2 capitalize">{payment.planType}</td>
                    <td className="py-2 capitalize">{payment.paymentMethod}</td>
                    <td className="py-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        payment.status === 'completed' 
                          ? 'bg-green-100 text-green-800'
                          : payment.status === 'refunded'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {payment.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}