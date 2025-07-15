'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface PlanFeature {
  maxQueriesPerMonth: number;
  advancedCalculator: boolean;
  pdfReports: boolean;
  prioritySupport: boolean;
  bengaliSupport: boolean;
  businessFeatures: boolean;
  price: number;
  name: string;
  description: string;
  id: string;
  features: string[];
}

interface UserPlan {
  planType: string;
  features: any;
  subscription: any;
}

export default function PricingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [plans, setPlans] = useState<PlanFeature[]>([]);
  const [currentPlan, setCurrentPlan] = useState<UserPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);

  useEffect(() => {
    fetchPlans();
    if (session?.user) {
      fetchCurrentPlan();
    }
  }, [session]);

  const fetchPlans = async () => {
    try {
      const response = await fetch('/api/subscription/plans');
      const data = await response.json();
      setPlans(data.plans);
    } catch (error) {
      console.error('Failed to fetch plans:', error);
    }
  };

  const fetchCurrentPlan = async () => {
    try {
      const response = await fetch('/api/subscription/usage');
      if (response.ok) {
        const data = await response.json();
        setCurrentPlan(data);
      }
    } catch (error) {
      console.error('Failed to fetch current plan:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planId: string) => {
    if (!session?.user) {
      router.push('/auth/signin');
      return;
    }

    setUpgrading(planId);

    try {
      // First check if upgrade is possible
      const upgradeResponse = await fetch('/api/subscription/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planType: planId })
      });

      const upgradeData = await upgradeResponse.json();

      if (upgradeData.success) {
        // Direct upgrade successful
        alert('Plan upgraded successfully!');
        fetchCurrentPlan();
      } else if (upgradeData.requiredPayment) {
        // Payment required
        const paymentResponse = await fetch('/api/payment/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planType: planId, billingPeriod: 'yearly' })
        });

        const paymentData = await paymentResponse.json();

        if (paymentData.success) {
          // Redirect to bKash payment
          window.open(paymentData.bkashUrl, '_blank');
          
          // Show payment instructions
          alert('Please complete the payment in the new window. Your subscription will be activated automatically after successful payment.');
        } else {
          alert('Failed to create payment. Please try again.');
        }
      } else {
        alert(upgradeData.message);
      }
    } catch (error) {
      console.error('Upgrade error:', error);
      alert('Failed to upgrade plan. Please try again.');
    } finally {
      setUpgrading(null);
    }
  };

  const isCurrentPlan = (planId: string) => {
    return currentPlan?.planType === planId;
  };

  const canUpgrade = (planId: string) => {
    if (!currentPlan) return true;
    
    const planOrder = { free: 0, pro: 1, business: 2 };
    const currentOrder = planOrder[currentPlan.planType as keyof typeof planOrder];
    const targetOrder = planOrder[planId as keyof typeof planOrder];
    
    return targetOrder > currentOrder;
  };

  if (loading && session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading pricing information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Get professional tax advice at a fraction of the cost. All plans include our AI-powered tax consultation.
          </p>
          
          {currentPlan && (
            <div className="mt-6 p-4 bg-blue-100 rounded-lg inline-block">
              <p className="text-blue-800">
                Current Plan: <span className="font-semibold">{currentPlan.features.name}</span>
                {currentPlan.subscription && (
                  <span className="ml-2 text-sm">
                    (Expires: {new Date(currentPlan.subscription.endDate).toLocaleDateString()})
                  </span>
                )}
              </p>
            </div>
          )}
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`bg-white rounded-2xl shadow-lg p-8 relative ${
                plan.id === 'pro' ? 'ring-2 ring-blue-500 scale-105' : ''
              }`}
            >
              {plan.id === 'pro' && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <p className="text-gray-600 mb-6">{plan.description}</p>
                
                <div className="mb-6">
                  <span className="text-4xl font-bold text-gray-900">
                    ৳{plan.price.toLocaleString()}
                  </span>
                  {plan.price > 0 && (
                    <span className="text-gray-600 ml-2">/year</span>
                  )}
                </div>

                {/* Features List */}
                <ul className="text-left space-y-3 mb-8">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center">
                      <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Action Button */}
                <button
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={
                    isCurrentPlan(plan.id) || 
                    !canUpgrade(plan.id) || 
                    upgrading === plan.id ||
                    (plan.id === 'free' && currentPlan?.planType !== 'free')
                  }
                  className={`w-full py-3 px-6 rounded-lg font-medium transition-colors ${
                    isCurrentPlan(plan.id)
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      : !canUpgrade(plan.id)
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      : plan.id === 'pro'
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-900 text-white hover:bg-gray-800'
                  }`}
                >
                  {upgrading === plan.id ? (
                    <span className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </span>
                  ) : isCurrentPlan(plan.id) ? (
                    'Current Plan'
                  ) : !canUpgrade(plan.id) ? (
                    'Downgrade'
                  ) : plan.id === 'free' ? (
                    'Current Plan'
                  ) : (
                    `Upgrade to ${plan.name}`
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="mt-16 max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">
            Frequently Asked Questions
          </h2>
          
          <div className="space-y-6">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">
                Can I change my plan anytime?
              </h3>
              <p className="text-gray-600">
                Yes, you can upgrade your plan anytime. Downgrades will take effect at the end of your current billing cycle.
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">
                What payment methods do you accept?
              </h3>
              <p className="text-gray-600">
                We accept bKash, Nagad, and major credit/debit cards. All payments are processed securely.
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">
                Is there a refund policy?
              </h3>
              <p className="text-gray-600">
                Yes, we offer a 30-day money-back guarantee. If you're not satisfied, we'll refund your payment.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}