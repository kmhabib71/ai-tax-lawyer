import { taxChatService, ChatRequest, ChatResponse } from './chat'

export interface TaxScenario {
  userType: 'salaried' | 'freelancer' | 'landlord' | 'business' | 'other'
  income: {
    basic?: number
    allowances?: number
    freelanceIncome?: number
    rentalIncome?: number
    businessIncome?: number
    foreignIncome?: number
  }
  deductions: {
    investments?: number
    insurance?: number
    houseRent?: number
    medicalExpenses?: number
    professionalExpenses?: number
    businessExpenses?: number
  }
  location?: 'dhaka' | 'chittagong' | 'other'
  assessmentYear: string
}

export interface TaxAdvice {
  currentTax: number
  optimizedTax: number
  potentialSavings: number
  recommendations: Array<{
    title: string
    description: string
    amount: number
    section: string
    priority: 'high' | 'medium' | 'low'
  }>
  warnings: string[]
  nextSteps: string[]
}

export class TaxAdvisorService {
  async analyzeScenario(scenario: TaxScenario): Promise<TaxAdvice> {
    // Calculate current tax liability
    const currentTax = this.calculateCurrentTax(scenario)
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(scenario)
    
    // Calculate optimized tax with recommendations
    const optimizedTax = this.calculateOptimizedTax(scenario, recommendations)
    
    // Generate warnings and next steps
    const warnings = this.generateWarnings(scenario)
    const nextSteps = this.generateNextSteps(scenario, recommendations)
    
    return {
      currentTax,
      optimizedTax,
      potentialSavings: currentTax - optimizedTax,
      recommendations,
      warnings,
      nextSteps
    }
  }

  async getPersonalizedAdvice(scenario: TaxScenario, userQuestion: string): Promise<ChatResponse> {
    // Create context-aware prompt
    const contextPrompt = this.buildContextPrompt(scenario)
    
    const request: ChatRequest = {
      message: `${contextPrompt}\n\nUser Question: ${userQuestion}`,
      userType: scenario.userType,
      conversationHistory: [],
      context: [] // TODO: Add relevant tax documents from RAG
    }
    
    return await taxChatService.generateResponse(request)
  }

  private calculateCurrentTax(scenario: TaxScenario): number {
    let taxableIncome = 0
    
    // Calculate taxable income based on user type
    switch (scenario.userType) {
      case 'salaried':
        taxableIncome = (scenario.income.basic || 0) + (scenario.income.allowances || 0)
        // Apply standard deductions for salaried employees
        taxableIncome -= Math.min(scenario.income.basic || 0 * 0.25, 450000) // House rent allowance
        break
        
      case 'freelancer':
        taxableIncome = (scenario.income.freelanceIncome || 0) + (scenario.income.foreignIncome || 0)
        // Professional expenses deduction
        taxableIncome -= Math.min((scenario.deductions.professionalExpenses || 0), taxableIncome * 0.3)
        break
        
      case 'landlord':
        taxableIncome = scenario.income.rentalIncome || 0
        // Standard deduction for rental income (25%)
        taxableIncome -= taxableIncome * 0.25
        break
        
      case 'business':
        taxableIncome = (scenario.income.businessIncome || 0) - (scenario.deductions.businessExpenses || 0)
        break
    }
    
    // Apply standard exemptions and investment deductions
    taxableIncome -= 350000 // Basic exemption limit for AY 2024-25
    taxableIncome -= Math.min(scenario.deductions.investments || 0, 1500000) // Investment allowance
    taxableIncome -= Math.min(scenario.deductions.insurance || 0, 100000) // Life insurance premium
    
    // Calculate tax using Bangladesh tax slabs (AY 2024-25)
    return this.calculateTaxFromSlabs(Math.max(taxableIncome, 0))
  }

  private calculateTaxFromSlabs(taxableIncome: number): number {
    if (taxableIncome <= 0) return 0
    
    const taxSlabs = [
      { min: 0, max: 350000, rate: 0 },
      { min: 350000, max: 450000, rate: 0.05 },
      { min: 450000, max: 750000, rate: 0.10 },
      { min: 750000, max: 1150000, rate: 0.15 },
      { min: 1150000, max: 1650000, rate: 0.20 },
      { min: 1650000, max: Infinity, rate: 0.25 }
    ]
    
    let tax = 0
    let remainingIncome = taxableIncome
    
    for (const slab of taxSlabs) {
      if (remainingIncome <= 0) break
      
      const slabWidth = slab.max - slab.min
      const taxableInThisSlab = Math.min(remainingIncome, slabWidth)
      
      if (taxableInThisSlab > 0) {
        tax += taxableInThisSlab * slab.rate
        remainingIncome -= taxableInThisSlab
      }
    }
    
    return Math.round(tax)
  }

  private generateRecommendations(scenario: TaxScenario): TaxAdvice['recommendations'] {
    const recommendations: TaxAdvice['recommendations'] = []
    
    // Investment recommendations
    if ((scenario.deductions.investments || 0) < 1500000) {
      const potentialSaving = Math.min(1500000 - (scenario.deductions.investments || 0), 1500000)
      recommendations.push({
        title: 'Maximize Investment Allowance',
        description: 'Invest in approved securities, savings certificates, or DPS to get tax credit',
        amount: potentialSaving * 0.15, // 15% tax credit
        section: 'Section 44 - Investment Tax Credit',
        priority: 'high'
      })
    }
    
    // User-specific recommendations
    switch (scenario.userType) {
      case 'salaried':
        if (!scenario.deductions.houseRent) {
          recommendations.push({
            title: 'House Rent Allowance Optimization',
            description: 'Ensure proper documentation for house rent to maximize HRA exemption',
            amount: Math.min((scenario.income.basic || 0) * 0.25, 450000) * 0.15,
            section: 'Section 82C(2)(a)',
            priority: 'high'
          })
        }
        break
        
      case 'freelancer':
        recommendations.push({
          title: 'Professional Expense Deduction',
          description: 'Claim business expenses like equipment, internet, and home office costs',
          amount: Math.min((scenario.income.freelanceIncome || 0) * 0.3, 500000) * 0.15,
          section: 'Section 82C(2)(b)',
          priority: 'medium'
        })
        break
    }
    
    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })
  }

  private calculateOptimizedTax(scenario: TaxScenario, recommendations: TaxAdvice['recommendations']): number {
    // Apply all high-priority recommendations
    const implementedSavings = recommendations
      .filter(r => r.priority === 'high')
      .reduce((total, r) => total + r.amount, 0)
    
    return Math.max(this.calculateCurrentTax(scenario) - implementedSavings, 0)
  }

  private generateWarnings(scenario: TaxScenario): string[] {
    const warnings: string[] = []
    
    // Income-based warnings
    const totalIncome = Object.values(scenario.income).reduce((sum, val) => sum + (val || 0), 0)
    
    if (totalIncome > 400000 && scenario.assessmentYear === '2024-25') {
      warnings.push('You are required to file a tax return as your income exceeds BDT 4 lakh')
    }
    
    if (scenario.income.foreignIncome && scenario.income.foreignIncome > 0) {
      warnings.push('Foreign income must be reported. Consider exchange rate fluctuations and advance tax requirements')
    }
    
    if (scenario.userType === 'business' && totalIncome > 8000000) {
      warnings.push('Large businesses may be subject to additional compliance requirements and audit')
    }
    
    return warnings
  }

  private generateNextSteps(scenario: TaxScenario, recommendations: TaxAdvice['recommendations']): string[] {
    const steps: string[] = []
    
    // High-priority actions
    const highPriorityRecommendations = recommendations.filter(r => r.priority === 'high')
    if (highPriorityRecommendations.length > 0) {
      steps.push('Implement high-priority tax saving opportunities immediately')
    }
    
    // Documentation requirements
    steps.push('Gather all required supporting documents and receipts')
    steps.push('Consider consulting with a qualified Chartered Accountant for complex scenarios')
    
    // Timeline-based steps
    const currentMonth = new Date().getMonth() + 1
    if (currentMonth >= 7 && currentMonth <= 11) {
      steps.push('Start preparing for upcoming tax season (deadline: November 30)')
    } else if (currentMonth >= 12 || currentMonth <= 6) {
      steps.push('File your return before the deadline to avoid penalties')
    }
    
    return steps
  }

  private buildContextPrompt(scenario: TaxScenario): string {
    return `
User Profile:
- Type: ${scenario.userType}
- Assessment Year: ${scenario.assessmentYear}
- Total Income: BDT ${Object.values(scenario.income).reduce((sum, val) => sum + (val || 0), 0).toLocaleString()}
- Current Deductions: BDT ${Object.values(scenario.deductions).reduce((sum, val) => sum + (val || 0), 0).toLocaleString()}
- Location: ${scenario.location || 'Not specified'}

Please provide specific, actionable advice based on current NBR rules and regulations for Bangladesh.
    `.trim()
  }
}

export const taxAdvisorService = new TaxAdvisorService()