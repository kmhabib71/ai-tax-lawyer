'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from 'next/navigation'

type UserType = 'salaried' | 'freelancer' | 'business' | 'landlord' | null

interface OnboardingStep {
  title: string
  description: string
  component: React.ReactNode
}

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(0)
  const [userType, setUserType] = useState<UserType>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    annualIncome: '',
    taxYear: '2024-25',
    hasAccountant: false,
    primaryGoal: ''
  })
  const router = useRouter()

  const userTypes = [
    {
      id: 'salaried' as const,
      title: 'Salaried Employee',
      description: 'I receive a regular salary and want to optimize my tax deductions',
      icon: '💼',
      benefits: ['Maximize deductions', 'Tax-saving investments', 'Rebate optimization']
    },
    {
      id: 'freelancer' as const,
      title: 'Freelancer',
      description: 'I work as a freelancer or consultant with variable income',
      icon: '💻',
      benefits: ['Income reporting', 'Foreign remittance', 'Quarterly planning']
    },
    {
      id: 'business' as const,
      title: 'Business Owner',
      description: 'I own a business or trade and need corporate tax guidance',
      icon: '🏢',
      benefits: ['Business expenses', 'VAT compliance', 'Depreciation']
    },
    {
      id: 'landlord' as const,
      title: 'Landlord',
      description: 'I earn rental income and need property tax optimization',
      icon: '🏠',
      benefits: ['Rental income tax', 'Property deductions', 'Legal compliance']
    }
  ]

  const steps: OnboardingStep[] = [
    {
      title: 'Welcome to AI Tax Lawyer',
      description: 'Let\'s get you set up with personalized tax advice',
      component: (
        <div className="text-center space-y-6">
          <div className="text-6xl">🎯</div>
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Get Started in 3 Simple Steps</h2>
            <div className="grid md:grid-cols-3 gap-4 max-w-2xl mx-auto">
              <div className="text-center">
                <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
                  <span className="text-blue-600 font-semibold">1</span>
                </div>
                <p className="text-sm text-gray-600">Choose Your Profile</p>
              </div>
              <div className="text-center">
                <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
                  <span className="text-blue-600 font-semibold">2</span>
                </div>
                <p className="text-sm text-gray-600">Share Basic Info</p>
              </div>
              <div className="text-center">
                <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
                  <span className="text-blue-600 font-semibold">3</span>
                </div>
                <p className="text-sm text-gray-600">Start Consulting</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: 'Choose Your Tax Profile',
      description: 'Select the option that best describes your situation',
      component: (
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
            {userTypes.map((type) => (
              <Card
                key={type.id}
                className={`cursor-pointer transition-all duration-200 ${
                  userType === type.id 
                    ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50' 
                    : 'hover:shadow-md'
                }`}
                onClick={() => setUserType(type.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{type.icon}</span>
                    <div>
                      <CardTitle className="text-lg">{type.title}</CardTitle>
                      <CardDescription className="text-sm">
                        {type.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">You&apos;ll get help with:</p>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {type.benefits.map((benefit, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <span className="text-green-500">✓</span>
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )
    },
    {
      title: 'Tell Us About Yourself',
      description: 'Help us personalize your experience',
      component: (
        <div className="max-w-md mx-auto space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your full name"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your email"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Annual Income (BDT)
            </label>
            <select
              value={formData.annualIncome}
              onChange={(e) => setFormData({...formData, annualIncome: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select income range</option>
              <option value="below-300000">Below 3,00,000 BDT</option>
              <option value="300000-500000">3,00,000 - 5,00,000 BDT</option>
              <option value="500000-1000000">5,00,000 - 10,00,000 BDT</option>
              <option value="1000000-2000000">10,00,000 - 20,00,000 BDT</option>
              <option value="above-2000000">Above 20,00,000 BDT</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tax Year
            </label>
            <select
              value={formData.taxYear}
              onChange={(e) => setFormData({...formData, taxYear: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="2024-25">2024-25</option>
              <option value="2023-24">2023-24</option>
              <option value="2022-23">2022-23</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              What&apos;s your primary goal?
            </label>
            <select
              value={formData.primaryGoal}
              onChange={(e) => setFormData({...formData, primaryGoal: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select your goal</option>
              <option value="reduce-tax">Reduce tax liability</option>
              <option value="compliance">Ensure compliance</option>
              <option value="planning">Tax planning</option>
              <option value="understanding">Understand tax rules</option>
            </select>
          </div>
        </div>
      )
    }
  ]

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleComplete()
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = () => {
    const onboardingData = {
      userType,
      ...formData,
      completedAt: new Date().toISOString()
    }
    
    localStorage.setItem('onboarding', JSON.stringify(onboardingData))
    router.push('/chat')
  }

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return true
      case 1:
        return userType !== null
      case 2:
        return formData.name && formData.email && formData.annualIncome && formData.primaryGoal
      default:
        return false
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-500">
                Step {currentStep + 1} of {steps.length}
              </span>
              <span className="text-sm font-medium text-gray-500">
                {Math.round(((currentStep + 1) / steps.length) * 100)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Step Content */}
          <Card className="mb-8">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">{steps[currentStep].title}</CardTitle>
              <CardDescription className="text-lg">
                {steps[currentStep].description}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {steps[currentStep].component}
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 0}
              className="px-6"
            >
              Back
            </Button>
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className="px-6 bg-blue-600 hover:bg-blue-700"
            >
              {currentStep === steps.length - 1 ? 'Complete Setup' : 'Next'}
            </Button>
          </div>
        </div>
      </div>
    </main>
  )
}