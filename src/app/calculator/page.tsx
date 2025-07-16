'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Calculator, TrendingUp, AlertTriangle, BookOpen, Download } from 'lucide-react'
import { TaxScenario, TaxAdvice, taxAdvisorService } from '@/lib/ai/tax-advisor'
import { useTranslation } from "@/contexts/LanguageContext"

interface FormData extends TaxScenario {
  // Additional UI state
}

export default function TaxCalculatorPage() {
  const { t } = useTranslation()
  const [formData, setFormData] = useState<FormData>({
    userType: 'salaried',
    income: {},
    deductions: {},
    location: 'dhaka',
    assessmentYear: '2024-25'
  })

  const [result, setResult] = useState<TaxAdvice | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)

  const handleInputChange = (section: 'income' | 'deductions', field: string, value: string) => {
    const numValue = value === '' ? undefined : Number(value)
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: numValue
      }
    }))
  }

  const handleCalculate = async () => {
    setIsCalculating(true)
    setError(null)
    try {
      const response = await fetch('/api/tax-calculator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to calculate tax')
      }

      setResult(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to calculate tax. Please try again.')
      console.error('Tax calculation error:', err)
    } finally {
      setIsCalculating(false)
    }
  }

  const handleDownloadReport = async () => {
    if (!result) return
    
    setIsGeneratingReport(true)
    try {
      const response = await fetch('/api/generate-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scenario: formData,
          taxAnalysis: result,
          reportType: 'full'
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
      link.download = data.data.filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report. Please try again.')
      console.error('Report generation error:', err)
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

  const renderIncomeFields = () => {
    switch (formData.userType) {
      case 'salaried':
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="basic">Basic Salary (Annual)</Label>
              <Input
                id="basic"
                type="number"
                placeholder="0"
                value={formData.income.basic || ''}
                onChange={(e) => handleInputChange('income', 'basic', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="allowances">Allowances & Benefits</Label>
              <Input
                id="allowances"
                type="number"
                placeholder="0"
                value={formData.income.allowances || ''}
                onChange={(e) => handleInputChange('income', 'allowances', e.target.value)}
              />
            </div>
          </>
        )
      case 'freelancer':
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="freelanceIncome">Freelance Income (Annual)</Label>
              <Input
                id="freelanceIncome"
                type="number"
                placeholder="0"
                value={formData.income.freelanceIncome || ''}
                onChange={(e) => handleInputChange('income', 'freelanceIncome', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="foreignIncome">Foreign Income</Label>
              <Input
                id="foreignIncome"
                type="number"
                placeholder="0"
                value={formData.income.foreignIncome || ''}
                onChange={(e) => handleInputChange('income', 'foreignIncome', e.target.value)}
              />
            </div>
          </>
        )
      case 'landlord':
        return (
          <div className="space-y-2">
            <Label htmlFor="rentalIncome">Rental Income (Annual)</Label>
            <Input
              id="rentalIncome"
              type="number"
              placeholder="0"
              value={formData.income.rentalIncome || ''}
              onChange={(e) => handleInputChange('income', 'rentalIncome', e.target.value)}
            />
          </div>
        )
      case 'business':
        return (
          <div className="space-y-2">
            <Label htmlFor="businessIncome">Business Income (Annual)</Label>
            <Input
              id="businessIncome"
              type="number"
              placeholder="0"
              value={formData.income.businessIncome || ''}
              onChange={(e) => handleInputChange('income', 'businessIncome', e.target.value)}
            />
          </div>
        )
      default:
        return null
    }
  }

  const renderDeductionFields = () => (
    <>
      <div className="space-y-2">
        <Label htmlFor="investments">Investments (Tax Credit)</Label>
        <Input
          id="investments"
          type="number"
          placeholder="0"
          value={formData.deductions.investments || ''}
          onChange={(e) => handleInputChange('deductions', 'investments', e.target.value)}
        />
        <p className="text-xs text-muted-foreground">Maximum: BDT 15,00,000</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="insurance">Life Insurance Premium</Label>
        <Input
          id="insurance"
          type="number"
          placeholder="0"
          value={formData.deductions.insurance || ''}
          onChange={(e) => handleInputChange('deductions', 'insurance', e.target.value)}
        />
        <p className="text-xs text-muted-foreground">Maximum: BDT 1,00,000</p>
      </div>
      {formData.userType === 'salaried' && (
        <div className="space-y-2">
          <Label htmlFor="houseRent">House Rent (Annual)</Label>
          <Input
            id="houseRent"
            type="number"
            placeholder="0"
            value={formData.deductions.houseRent || ''}
            onChange={(e) => handleInputChange('deductions', 'houseRent', e.target.value)}
          />
        </div>
      )}
      {formData.userType === 'freelancer' && (
        <div className="space-y-2">
          <Label htmlFor="professionalExpenses">Professional Expenses</Label>
          <Input
            id="professionalExpenses"
            type="number"
            placeholder="0"
            value={formData.deductions.professionalExpenses || ''}
            onChange={(e) => handleInputChange('deductions', 'professionalExpenses', e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Maximum: 30% of income</p>
        </div>
      )}
      {formData.userType === 'business' && (
        <div className="space-y-2">
          <Label htmlFor="businessExpenses">Business Expenses</Label>
          <Input
            id="businessExpenses"
            type="number"
            placeholder="0"
            value={formData.deductions.businessExpenses || ''}
            onChange={(e) => handleInputChange('deductions', 'businessExpenses', e.target.value)}
          />
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="medicalExpenses">Medical Expenses</Label>
        <Input
          id="medicalExpenses"
          type="number"
          placeholder="0"
          value={formData.deductions.medicalExpenses || ''}
          onChange={(e) => handleInputChange('deductions', 'medicalExpenses', e.target.value)}
        />
      </div>
    </>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Calculator className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">{t('calculator.title')}</h1>
          </div>
          <p className="text-gray-600 max-w-2xl mx-auto">
            {t('calculator.description')}
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Input Form */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Tax Information</CardTitle>
                <CardDescription>Enter your income and deduction details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* User Type Selection */}
                <div className="space-y-2">
                  <Label>{t('calculator.userType')}</Label>
                  <Select
                    value={formData.userType}
                    onValueChange={(value: any) => setFormData(prev => ({ ...prev, userType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="salaried">{t('calculator.salariedEmployee')}</SelectItem>
                      <SelectItem value="freelancer">{t('calculator.freelancer')}</SelectItem>
                      <SelectItem value="landlord">{t('calculator.landlord')}</SelectItem>
                      <SelectItem value="business">{t('calculator.businessOwner')}</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Assessment Year */}
                <div className="space-y-2">
                  <Label>Assessment Year</Label>
                  <Select
                    value={formData.assessmentYear}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, assessmentYear: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2024-25">2024-25</SelectItem>
                      <SelectItem value="2023-24">2023-24</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Select
                    value={formData.location}
                    onValueChange={(value: any) => setFormData(prev => ({ ...prev, location: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dhaka">Dhaka</SelectItem>
                      <SelectItem value="chittagong">Chittagong</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Tabs defaultValue="income" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="income">{t('calculator.income')}</TabsTrigger>
                    <TabsTrigger value="deductions">{t('calculator.deductions')}</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="income" className="space-y-4">
                    <div className="grid gap-4">
                      {renderIncomeFields()}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="deductions" className="space-y-4">
                    <div className="grid gap-4">
                      {renderDeductionFields()}
                    </div>
                  </TabsContent>
                </Tabs>

                <Button 
                  onClick={handleCalculate} 
                  disabled={isCalculating}
                  className="w-full"
                  size="lg"
                >
                  {isCalculating ? t('common.loading') : t('calculator.calculate')}
                </Button>

                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800">{error}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Results */}
          <div className="space-y-6">
            {result ? (
              <>
                {/* Tax Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Tax Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Current Tax Liability:</span>
                        <span className="text-lg font-bold text-red-600">
                          {formatCurrency(result.currentTax)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Optimized Tax:</span>
                        <span className="text-lg font-bold text-green-600">
                          {formatCurrency(result.optimizedTax)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center border-t pt-4">
                        <span className="text-base font-semibold">Potential Savings:</span>
                        <span className="text-xl font-bold text-blue-600">
                          {formatCurrency(result.potentialSavings)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Recommendations */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5" />
                      Tax Optimization Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {result.recommendations.map((rec, index) => (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h4 className="font-semibold">{rec.title}</h4>
                            <Badge variant={rec.priority === 'high' ? 'destructive' : rec.priority === 'medium' ? 'default' : 'secondary'}>
                              {rec.priority}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{rec.description}</p>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-blue-600 font-medium">{rec.section}</span>
                            <span className="font-semibold">Save: {formatCurrency(rec.amount)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Warnings */}
                {result.warnings.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-yellow-600" />
                        Important Warnings
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {result.warnings.map((warning, index) => (
                          <div key={index} className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-yellow-800">{warning}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Next Steps */}
                <Card>
                  <CardHeader>
                    <CardTitle>Next Steps</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {result.nextSteps.map((step, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-sm font-semibold flex items-center justify-center mt-0.5">
                            {index + 1}
                          </div>
                          <p className="text-sm">{step}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="flex gap-4">
                  <Button 
                    variant="outline" 
                    className="flex-1" 
                    onClick={handleDownloadReport}
                    disabled={isGeneratingReport}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {isGeneratingReport ? 'Generating...' : 'Download Report'}
                  </Button>
                  <Button className="flex-1">
                    Chat with AI Advisor
                  </Button>
                </div>
              </>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Calculator className="h-12 w-12 text-gray-300 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">Ready to Calculate</h3>
                  <p className="text-sm text-gray-500 text-center">
                    Fill in your income and deduction details, then click "Calculate Tax" to see your results
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Legal Disclaimer */}
        <div className="mt-12 p-6 bg-white border rounded-lg">
          <h3 className="font-semibold mb-2">Legal Disclaimer</h3>
          <p className="text-sm text-gray-600">
            This calculator provides estimates based on current NBR tax rules and regulations. Results should not be considered as professional tax advice. 
            For complex tax situations, please consult with a qualified Chartered Accountant. AI Tax Lawyer is not responsible for any decisions made based on these calculations.
          </p>
        </div>
      </div>
    </div>
  )
}