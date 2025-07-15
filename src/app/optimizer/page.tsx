'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  TrendingUp, 
  Target, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  DollarSign,
  FileText,
  Calculator,
  Lightbulb,
  Download
} from 'lucide-react'
import { TaxScenario, TaxAdvice } from '@/lib/ai/tax-advisor'

interface DeductionOpportunity {
  id: string
  title: string
  description: string
  category: 'investment' | 'expense' | 'allowance' | 'exemption'
  potentialSaving: number
  currentAmount: number
  maxAllowed: number
  urgency: 'high' | 'medium' | 'low'
  difficulty: 'easy' | 'medium' | 'hard'
  requiredDocuments: string[]
  steps: string[]
  deadline?: string
  section: string
  eligibilityCheck: (scenario: TaxScenario) => boolean
}

const deductionOpportunities: DeductionOpportunity[] = [
  {
    id: 'investment-allowance',
    title: 'Investment Tax Credit',
    description: 'Invest in approved securities, savings certificates, or DPS to get 15% tax credit',
    category: 'investment',
    potentialSaving: 225000, // 15% of 1.5M
    currentAmount: 0,
    maxAllowed: 1500000,
    urgency: 'high',
    difficulty: 'easy',
    requiredDocuments: ['Investment certificates', 'Bank statements', 'Purchase receipts'],
    steps: [
      'Choose approved investment options (savings certificates, DPS, mutual funds)',
      'Open investment account with authorized financial institution',
      'Make investment before June 30',
      'Collect all investment certificates and receipts',
      'Claim 15% tax credit in your return'
    ],
    deadline: 'June 30',
    section: 'Section 44 - Investment Tax Credit',
    eligibilityCheck: (scenario) => true
  },
  {
    id: 'life-insurance',
    title: 'Life Insurance Premium Deduction',
    description: 'Deduct life insurance premiums up to BDT 1,00,000',
    category: 'expense',
    potentialSaving: 25000, // 25% of 100K
    currentAmount: 0,
    maxAllowed: 100000,
    urgency: 'medium',
    difficulty: 'easy',
    requiredDocuments: ['Insurance policy', 'Premium payment receipts', 'Insurance certificate'],
    steps: [
      'Purchase term or whole life insurance policy',
      'Pay premium before June 30',
      'Collect premium payment receipts',
      'Get insurance certificate from company',
      'Claim deduction in tax return'
    ],
    deadline: 'June 30',
    section: 'Section 82C(2)(d)',
    eligibilityCheck: (scenario) => true
  },
  {
    id: 'house-rent-allowance',
    title: 'House Rent Allowance (HRA)',
    description: 'Claim exemption on HRA up to 25% of basic salary or BDT 4,50,000',
    category: 'allowance',
    potentialSaving: 112500, // 25% of 450K
    currentAmount: 0,
    maxAllowed: 450000,
    urgency: 'high',
    difficulty: 'medium',
    requiredDocuments: ['Rent agreement', 'Rent receipts', 'Landlord TIN certificate', 'Salary certificate'],
    steps: [
      'Prepare formal rent agreement with landlord',
      'Ensure landlord has valid TIN certificate',
      'Collect monthly rent receipts',
      'Get HRA certificate from employer',
      'Submit documents with tax return'
    ],
    section: 'Section 82C(2)(a)',
    eligibilityCheck: (scenario) => scenario.userType === 'salaried'
  },
  {
    id: 'professional-expenses',
    title: 'Professional Expense Deduction',
    description: 'Claim business expenses up to 30% of professional income',
    category: 'expense',
    potentialSaving: 75000, // Example: 30% of 1M income = 300K, tax saving = 75K
    currentAmount: 0,
    maxAllowed: 0, // Calculated based on income
    urgency: 'high',
    difficulty: 'medium',
    requiredDocuments: ['Expense receipts', 'Business equipment invoices', 'Office rent receipts', 'Internet bills'],
    steps: [
      'Maintain detailed expense records',
      'Collect receipts for all business expenses',
      'Document home office expenses',
      'Keep internet and phone bills',
      'Calculate total eligible expenses'
    ],
    section: 'Section 82C(2)(b)',
    eligibilityCheck: (scenario) => scenario.userType === 'freelancer'
  },
  {
    id: 'donation-deduction',
    title: 'Charitable Donation Deduction',
    description: 'Donate to approved charitable organizations for tax benefits',
    category: 'expense',
    potentialSaving: 12500, // Example saving
    currentAmount: 0,
    maxAllowed: 200000,
    urgency: 'low',
    difficulty: 'easy',
    requiredDocuments: ['Donation receipts', 'Organization approval certificate', 'Bank transfer proof'],
    steps: [
      'Choose NBR-approved charitable organizations',
      'Make donation through proper channels',
      'Collect official donation receipt',
      'Verify organization approval status',
      'Claim deduction in return'
    ],
    section: 'Section 82C(2)(g)',
    eligibilityCheck: (scenario) => true
  },
  {
    id: 'medical-allowance',
    title: 'Medical Allowance Exemption',
    description: 'Claim exemption on medical allowance from employer',
    category: 'allowance',
    potentialSaving: 7500, // Example
    currentAmount: 0,
    maxAllowed: 120000,
    urgency: 'medium',
    difficulty: 'easy',
    requiredDocuments: ['Medical bills', 'Doctor prescriptions', 'Salary certificate', 'Medical allowance certificate'],
    steps: [
      'Collect all medical expense receipts',
      'Get prescriptions from qualified doctors',
      'Obtain medical allowance certificate from employer',
      'Maintain proper records',
      'Submit with tax return'
    ],
    section: 'Section 82C(2)(c)',
    eligibilityCheck: (scenario) => scenario.userType === 'salaried'
  }
]

export default function TaxOptimizerPage() {
  const [userScenario, setUserScenario] = useState<TaxScenario>({
    userType: 'salaried',
    income: { basic: 600000, allowances: 200000 },
    deductions: {},
    location: 'dhaka',
    assessmentYear: '2024-25'
  })

  const [selectedOpportunities, setSelectedOpportunities] = useState<string[]>([])
  const [customAmounts, setCustomAmounts] = useState<{ [key: string]: number }>({})
  const [totalSavings, setTotalSavings] = useState(0)
  const [implementationScore, setImplementationScore] = useState(0)
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)

  const eligibleOpportunities = deductionOpportunities.filter(
    opportunity => opportunity.eligibilityCheck(userScenario)
  )

  useEffect(() => {
    // Calculate total potential savings
    const savings = selectedOpportunities.reduce((total, id) => {
      const opportunity = deductionOpportunities.find(o => o.id === id)
      if (!opportunity) return total
      
      const customAmount = customAmounts[id] || 0
      const maxBenefit = Math.min(customAmount, opportunity.maxAllowed)
      const taxRate = 0.25 // Assume 25% tax bracket
      
      return total + (maxBenefit * taxRate)
    }, 0)
    
    setTotalSavings(savings)
    
    // Calculate implementation score
    const easyTasks = selectedOpportunities.filter(id => {
      const opp = deductionOpportunities.find(o => o.id === id)
      return opp?.difficulty === 'easy'
    }).length
    
    const mediumTasks = selectedOpportunities.filter(id => {
      const opp = deductionOpportunities.find(o => o.id === id)
      return opp?.difficulty === 'medium'
    }).length
    
    const hardTasks = selectedOpportunities.filter(id => {
      const opp = deductionOpportunities.find(o => o.id === id)
      return opp?.difficulty === 'hard'
    }).length
    
    const score = Math.min(100, (easyTasks * 15 + mediumTasks * 10 + hardTasks * 5))
    setImplementationScore(score)
  }, [selectedOpportunities, customAmounts])

  const handleOpportunityToggle = (opportunityId: string) => {
    setSelectedOpportunities(prev => 
      prev.includes(opportunityId)
        ? prev.filter(id => id !== opportunityId)
        : [...prev, opportunityId]
    )
  }

  const handleAmountChange = (opportunityId: string, amount: number) => {
    setCustomAmounts(prev => ({
      ...prev,
      [opportunityId]: amount
    }))
  }

  const handleDownloadActionPlan = async () => {
    setIsGeneratingReport(true)
    try {
      // Create a mock tax analysis for the optimizer report
      const mockAnalysis = {
        currentTax: totalSavings / 0.25, // Reverse calculate from savings
        optimizedTax: (totalSavings / 0.25) - totalSavings,
        potentialSavings: totalSavings,
        recommendations: selectedOpportunities.map(id => {
          const opp = deductionOpportunities.find(o => o.id === id)!
          return {
            title: opp.title,
            description: opp.description,
            amount: customAmounts[id] ? Math.min(customAmounts[id], opp.maxAllowed) * 0.25 : 0,
            section: opp.section,
            priority: opp.urgency as 'high' | 'medium' | 'low'
          }
        }),
        warnings: [],
        nextSteps: selectedOpportunities.flatMap(id => {
          const opp = deductionOpportunities.find(o => o.id === id)
          return opp ? opp.steps.slice(0, 2) : []
        })
      }

      const response = await fetch('/api/generate-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scenario: userScenario,
          taxAnalysis: mockAnalysis,
          reportType: 'optimization'
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate report')
      }

      // Create download link
      const htmlContent = atob(data.data.reportBase64)
      const blob = new Blob([htmlContent], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = `tax-optimization-plan-${Date.now()}.html`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

    } catch (err) {
      console.error('Report generation error:', err)
      // You might want to show an error message to the user
    } finally {
      setIsGeneratingReport(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-BD', {
      style: 'currency',
      currency: 'BDT',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getDifficultyIcon = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'medium': return <Clock className="h-4 w-4 text-yellow-600" />
      case 'hard': return <AlertCircle className="h-4 w-4 text-red-600" />
      default: return null
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Target className="h-8 w-8 text-green-600" />
            <h1 className="text-3xl font-bold text-gray-900">Tax Deduction Optimizer</h1>
          </div>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Discover and maximize your tax deductions using smart analysis and NBR-approved strategies
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Quick Stats */}
          <div className="lg:col-span-3 grid md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-600">Potential Savings</p>
                    <p className="text-xl font-bold text-green-600">{formatCurrency(totalSavings)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-600">Selected Strategies</p>
                    <p className="text-xl font-bold text-blue-600">{selectedOpportunities.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-yellow-600" />
                  <div>
                    <p className="text-sm text-gray-600">Available Options</p>
                    <p className="text-xl font-bold text-yellow-600">{eligibleOpportunities.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="text-sm text-gray-600">Implementation Score</p>
                    <p className="text-xl font-bold text-purple-600">{implementationScore}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Deduction Opportunities */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  Available Deduction Opportunities
                </CardTitle>
                <CardDescription>
                  Select the deductions you want to pursue and customize the amounts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {eligibleOpportunities.map((opportunity) => (
                    <div 
                      key={opportunity.id} 
                      className={`border rounded-lg p-4 transition-all ${
                        selectedOpportunities.includes(opportunity.id) 
                          ? 'border-blue-300 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedOpportunities.includes(opportunity.id)}
                          onCheckedChange={() => handleOpportunityToggle(opportunity.id)}
                        />
                        
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <h4 className="font-semibold text-gray-900">{opportunity.title}</h4>
                              <p className="text-sm text-gray-600">{opportunity.description}</p>
                            </div>
                            
                            <div className="flex flex-col items-end gap-2">
                              <Badge className={getUrgencyColor(opportunity.urgency)}>
                                {opportunity.urgency} priority
                              </Badge>
                              <div className="flex items-center gap-1">
                                {getDifficultyIcon(opportunity.difficulty)}
                                <span className="text-xs text-gray-500">{opportunity.difficulty}</span>
                              </div>
                            </div>
                          </div>
                          
                          {selectedOpportunities.includes(opportunity.id) && (
                            <div className="mt-4 space-y-3">
                              <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                  <Label htmlFor={`amount-${opportunity.id}`}>
                                    Amount to invest/claim
                                  </Label>
                                  <Input
                                    id={`amount-${opportunity.id}`}
                                    type="number"
                                    placeholder="0"
                                    value={customAmounts[opportunity.id] || ''}
                                    onChange={(e) => handleAmountChange(opportunity.id, Number(e.target.value))}
                                  />
                                  <p className="text-xs text-gray-500 mt-1">
                                    Maximum: {formatCurrency(opportunity.maxAllowed)}
                                  </p>
                                </div>
                                
                                <div>
                                  <Label>Estimated Tax Saving</Label>
                                  <div className="text-lg font-semibold text-green-600 mt-2">
                                    {formatCurrency(Math.min(customAmounts[opportunity.id] || 0, opportunity.maxAllowed) * 0.25)}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="text-xs text-blue-600 font-medium">
                                {opportunity.section}
                              </div>
                              
                              {opportunity.deadline && (
                                <div className="flex items-center gap-1 text-sm text-red-600">
                                  <Clock className="h-4 w-4" />
                                  Deadline: {opportunity.deadline}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Implementation Plan */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Implementation Plan
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedOpportunities.length === 0 ? (
                  <div className="text-center py-8">
                    <Calculator className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Select deductions to see your implementation plan</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-2">
                        <span>Progress</span>
                        <span>{implementationScore}%</span>
                      </div>
                      <Progress value={implementationScore} className="h-2" />
                    </div>
                    
                    {selectedOpportunities.map((id, index) => {
                      const opportunity = deductionOpportunities.find(o => o.id === id)
                      if (!opportunity) return null
                      
                      return (
                        <div key={id} className="border rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-sm font-semibold flex items-center justify-center">
                              {index + 1}
                            </div>
                            <h5 className="font-medium">{opportunity.title}</h5>
                          </div>
                          
                          <div className="ml-8 space-y-2">
                            <div className="text-sm font-medium text-green-600">
                              Target: {formatCurrency(customAmounts[id] || 0)}
                            </div>
                            
                            <div className="text-xs text-gray-600">
                              <p className="font-medium mb-1">Required Documents:</p>
                              <ul className="list-disc list-inside space-y-1">
                                {opportunity.requiredDocuments.map((doc, idx) => (
                                  <li key={idx}>{doc}</li>
                                ))}
                              </ul>
                            </div>
                            
                            <div className="text-xs text-gray-600">
                              <p className="font-medium mb-1">Next Steps:</p>
                              <ol className="list-decimal list-inside space-y-1">
                                {opportunity.steps.slice(0, 3).map((step, idx) => (
                                  <li key={idx}>{step}</li>
                                ))}
                              </ol>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Summary & Actions */}
            {selectedOpportunities.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Optimization Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-5 w-5 text-green-600" />
                        <span className="font-semibold text-green-800">Total Potential Savings</span>
                      </div>
                      <div className="text-2xl font-bold text-green-700">
                        {formatCurrency(totalSavings)}
                      </div>
                      <p className="text-sm text-green-600 mt-1">
                        Per year with selected strategies
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Button 
                        className="w-full" 
                        size="lg"
                        onClick={handleDownloadActionPlan}
                        disabled={isGeneratingReport}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        {isGeneratingReport ? 'Generating...' : 'Download Action Plan'}
                      </Button>
                      <Button variant="outline" className="w-full">
                        Schedule Consultation
                      </Button>
                      <Button variant="outline" className="w-full">
                        Set Reminders
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Legal Disclaimer */}
        <div className="mt-12 p-6 bg-white border rounded-lg">
          <h3 className="font-semibold mb-2">Important Legal Notice</h3>
          <p className="text-sm text-gray-600">
            This optimizer provides suggestions based on general NBR rules and regulations. Tax situations vary by individual circumstances. 
            Always verify eligibility requirements and consult with a qualified Chartered Accountant before implementing any tax strategy. 
            AI Tax Lawyer is not responsible for any tax consequences arising from the use of this tool.
          </p>
        </div>
      </div>
    </div>
  )
}