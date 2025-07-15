import { TaxScenario, TaxAdvice } from '@/lib/ai/tax-advisor'

export interface ReportData {
  userInfo: {
    name?: string
    email?: string
    userType: string
    assessmentYear: string
    location?: string
  }
  taxAnalysis: TaxAdvice
  scenario: TaxScenario
  generatedAt: string
  reportId: string
}

export class PDFReportGenerator {
  async generateTaxReport(data: ReportData): Promise<string> {
    // For now, we'll generate an HTML report that can be converted to PDF
    // In production, you would use libraries like puppeteer, jsPDF, or pdfkit
    
    const htmlContent = this.generateHTMLReport(data)
    
    // Convert to base64 for download
    return btoa(unescape(encodeURIComponent(htmlContent)))
  }

  private generateHTMLReport(data: ReportData): string {
    const { userInfo, taxAnalysis, scenario, generatedAt, reportId } = data
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tax Analysis Report - ${userInfo.name || 'Tax Analysis'}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #fff;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            text-align: center;
            border-bottom: 3px solid #2563eb;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 10px;
        }
        
        .title {
            font-size: 28px;
            font-weight: bold;
            color: #1f2937;
            margin-bottom: 10px;
        }
        
        .subtitle {
            color: #6b7280;
            font-size: 16px;
        }
        
        .section {
            margin-bottom: 30px;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            overflow: hidden;
        }
        
        .section-header {
            background: #f9fafb;
            padding: 15px 20px;
            border-bottom: 1px solid #e5e7eb;
            font-weight: bold;
            font-size: 18px;
            color: #374151;
        }
        
        .section-content {
            padding: 20px;
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 20px;
        }
        
        .info-item {
            display: flex;
            flex-direction: column;
        }
        
        .info-label {
            font-weight: bold;
            color: #374151;
            margin-bottom: 5px;
        }
        
        .info-value {
            color: #6b7280;
        }
        
        .tax-summary {
            background: #f0f9ff;
            border: 1px solid #0ea5e9;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
        }
        
        .tax-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 0;
            border-bottom: 1px solid #e0f2fe;
        }
        
        .tax-item:last-child {
            border-bottom: none;
            font-weight: bold;
            font-size: 18px;
            color: #0369a1;
        }
        
        .recommendation {
            background: #f0f9ff;
            border-left: 4px solid #0ea5e9;
            padding: 15px;
            margin-bottom: 15px;
        }
        
        .recommendation-title {
            font-weight: bold;
            color: #0369a1;
            margin-bottom: 8px;
        }
        
        .recommendation-description {
            color: #374151;
            margin-bottom: 10px;
        }
        
        .recommendation-details {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            font-size: 14px;
        }
        
        .priority-high {
            background: #fef2f2;
            border-left-color: #dc2626;
        }
        
        .priority-medium {
            background: #fffbeb;
            border-left-color: #d97706;
        }
        
        .priority-low {
            background: #f0fdf4;
            border-left-color: #16a34a;
        }
        
        .warning {
            background: #fffbeb;
            border: 1px solid #f59e0b;
            border-radius: 6px;
            padding: 12px;
            margin-bottom: 10px;
        }
        
        .warning-icon {
            color: #d97706;
            font-weight: bold;
            margin-right: 8px;
        }
        
        .next-step {
            display: flex;
            align-items: flex-start;
            padding: 10px 0;
            border-bottom: 1px solid #f3f4f6;
        }
        
        .next-step:last-child {
            border-bottom: none;
        }
        
        .step-number {
            background: #2563eb;
            color: white;
            border-radius: 50%;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: bold;
            margin-right: 12px;
            flex-shrink: 0;
        }
        
        .disclaimer {
            background: #f9fafb;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            padding: 20px;
            margin-top: 30px;
        }
        
        .disclaimer-title {
            font-weight: bold;
            color: #374151;
            margin-bottom: 10px;
        }
        
        .disclaimer-text {
            color: #6b7280;
            font-size: 14px;
            line-height: 1.5;
        }
        
        .footer {
            text-align: center;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            margin-top: 30px;
            color: #6b7280;
            font-size: 12px;
        }
        
        .currency {
            font-weight: bold;
        }
        
        .positive {
            color: #16a34a;
        }
        
        .negative {
            color: #dc2626;
        }
        
        @media print {
            .container {
                padding: 0;
            }
            
            .section {
                break-inside: avoid;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <div class="logo">⚖️ AI Tax Lawyer</div>
            <div class="title">Tax Analysis Report</div>
            <div class="subtitle">Professional Tax Consultation for Bangladesh</div>
        </div>

        <!-- User Information -->
        <div class="section">
            <div class="section-header">Client Information</div>
            <div class="section-content">
                <div class="info-grid">
                    <div class="info-item">
                        <div class="info-label">Taxpayer Type</div>
                        <div class="info-value">${this.formatUserType(userInfo.userType)}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Assessment Year</div>
                        <div class="info-value">${userInfo.assessmentYear}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Location</div>
                        <div class="info-value">${this.formatLocation(userInfo.location)}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Report Generated</div>
                        <div class="info-value">${new Date(generatedAt).toLocaleDateString('en-BD', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}</div>
                    </div>
                </div>
                <div class="info-item">
                    <div class="info-label">Report ID</div>
                    <div class="info-value">${reportId}</div>
                </div>
            </div>
        </div>

        <!-- Income Summary -->
        <div class="section">
            <div class="section-header">Income Summary</div>
            <div class="section-content">
                ${this.generateIncomeTable(scenario)}
            </div>
        </div>

        <!-- Tax Analysis -->
        <div class="section">
            <div class="section-header">Tax Analysis</div>
            <div class="section-content">
                <div class="tax-summary">
                    <div class="tax-item">
                        <span>Current Tax Liability:</span>
                        <span class="currency negative">${this.formatCurrency(taxAnalysis.currentTax)}</span>
                    </div>
                    <div class="tax-item">
                        <span>Optimized Tax:</span>
                        <span class="currency positive">${this.formatCurrency(taxAnalysis.optimizedTax)}</span>
                    </div>
                    <div class="tax-item">
                        <span>Potential Savings:</span>
                        <span class="currency positive">${this.formatCurrency(taxAnalysis.potentialSavings)}</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Recommendations -->
        <div class="section">
            <div class="section-header">Tax Optimization Recommendations</div>
            <div class="section-content">
                ${taxAnalysis.recommendations.map(rec => `
                    <div class="recommendation priority-${rec.priority}">
                        <div class="recommendation-title">${rec.title}</div>
                        <div class="recommendation-description">${rec.description}</div>
                        <div class="recommendation-details">
                            <div><strong>Potential Saving:</strong> ${this.formatCurrency(rec.amount)}</div>
                            <div><strong>Legal Section:</strong> ${rec.section}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>

        <!-- Warnings -->
        ${taxAnalysis.warnings.length > 0 ? `
        <div class="section">
            <div class="section-header">Important Warnings</div>
            <div class="section-content">
                ${taxAnalysis.warnings.map(warning => `
                    <div class="warning">
                        <span class="warning-icon">⚠️</span>
                        ${warning}
                    </div>
                `).join('')}
            </div>
        </div>
        ` : ''}

        <!-- Next Steps -->
        <div class="section">
            <div class="section-header">Recommended Next Steps</div>
            <div class="section-content">
                ${taxAnalysis.nextSteps.map((step, index) => `
                    <div class="next-step">
                        <div class="step-number">${index + 1}</div>
                        <div>${step}</div>
                    </div>
                `).join('')}
            </div>
        </div>

        <!-- Legal Disclaimer -->
        <div class="disclaimer">
            <div class="disclaimer-title">Legal Disclaimer</div>
            <div class="disclaimer-text">
                This report is generated by AI Tax Lawyer based on the information provided and current NBR rules and regulations. 
                The analysis and recommendations are for informational purposes only and should not be considered as professional tax advice. 
                Tax laws are complex and subject to change, and individual circumstances may vary significantly. 
                We strongly recommend consulting with a qualified Chartered Accountant or tax professional before making any tax-related decisions. 
                AI Tax Lawyer assumes no responsibility for any consequences arising from the use of this report or any actions taken based on its contents.
                
                <br><br>
                
                <strong>Important Notes:</strong><br>
                • All calculations are based on Assessment Year ${userInfo.assessmentYear} tax rates and rules<br>
                • Ensure compliance with latest NBR notifications and circulars<br>
                • Maintain proper documentation for all claimed deductions<br>
                • File your tax return before the statutory deadline<br>
                • This report is confidential and intended solely for the named recipient
            </div>
        </div>

        <!-- Footer -->
        <div class="footer">
            <div>Generated by AI Tax Lawyer - Bangladesh's Premier AI Tax Advisor</div>
            <div>Report ID: ${reportId} | Generated on: ${new Date(generatedAt).toISOString()}</div>
            <div style="margin-top: 10px;">
                <strong>For support:</strong> Visit our website or contact our customer service team
            </div>
        </div>
    </div>
</body>
</html>
    `.trim()
  }

  private generateIncomeTable(scenario: TaxScenario): string {
    const incomeEntries = Object.entries(scenario.income)
      .filter(([_, value]) => value && value > 0)
      .map(([key, value]) => [this.formatIncomeType(key), value])

    const deductionEntries = Object.entries(scenario.deductions)
      .filter(([_, value]) => value && value > 0)
      .map(([key, value]) => [this.formatDeductionType(key), value])

    return `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
        <div>
          <h4 style="margin-bottom: 15px; color: #374151;">Income Sources</h4>
          ${incomeEntries.length > 0 ? `
            <table style="width: 100%; border-collapse: collapse;">
              ${incomeEntries.map(([type, amount]) => `
                <tr style="border-bottom: 1px solid #f3f4f6;">
                  <td style="padding: 8px 0; color: #6b7280;">${type}</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: bold;">${this.formatCurrency(amount!)}</td>
                </tr>
              `).join('')}
              <tr style="border-top: 2px solid #d1d5db; font-weight: bold;">
                <td style="padding: 10px 0; color: #374151;">Total Income</td>
                <td style="padding: 10px 0; text-align: right; color: #374151;">${this.formatCurrency(
                  Object.values(scenario.income).reduce((sum, val) => sum + (val || 0), 0)
                )}</td>
              </tr>
            </table>
          ` : '<p style="color: #6b7280; font-style: italic;">No income sources specified</p>'}
        </div>
        
        <div>
          <h4 style="margin-bottom: 15px; color: #374151;">Deductions</h4>
          ${deductionEntries.length > 0 ? `
            <table style="width: 100%; border-collapse: collapse;">
              ${deductionEntries.map(([type, amount]) => `
                <tr style="border-bottom: 1px solid #f3f4f6;">
                  <td style="padding: 8px 0; color: #6b7280;">${type}</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: bold;">${this.formatCurrency(amount!)}</td>
                </tr>
              `).join('')}
              <tr style="border-top: 2px solid #d1d5db; font-weight: bold;">
                <td style="padding: 10px 0; color: #374151;">Total Deductions</td>
                <td style="padding: 10px 0; text-align: right; color: #374151;">${this.formatCurrency(
                  Object.values(scenario.deductions).reduce((sum, val) => sum + (val || 0), 0)
                )}</td>
              </tr>
            </table>
          ` : '<p style="color: #6b7280; font-style: italic;">No deductions specified</p>'}
        </div>
      </div>
    `
  }

  private formatUserType(userType: string): string {
    const types = {
      salaried: 'Salaried Employee',
      freelancer: 'Freelancer/Consultant',
      landlord: 'Property Owner',
      business: 'Business Owner',
      other: 'Other'
    }
    return types[userType as keyof typeof types] || userType
  }

  private formatLocation(location?: string): string {
    if (!location) return 'Not specified'
    const locations = {
      dhaka: 'Dhaka',
      chittagong: 'Chittagong',
      other: 'Other city'
    }
    return locations[location as keyof typeof locations] || location
  }

  private formatIncomeType(type: string): string {
    const types = {
      basic: 'Basic Salary',
      allowances: 'Allowances & Benefits',
      freelanceIncome: 'Freelance Income',
      rentalIncome: 'Rental Income',
      businessIncome: 'Business Income',
      foreignIncome: 'Foreign Income'
    }
    return types[type as keyof typeof types] || type
  }

  private formatDeductionType(type: string): string {
    const types = {
      investments: 'Investment Tax Credit',
      insurance: 'Life Insurance Premium',
      houseRent: 'House Rent',
      medicalExpenses: 'Medical Expenses',
      professionalExpenses: 'Professional Expenses',
      businessExpenses: 'Business Expenses'
    }
    return types[type as keyof typeof types] || type
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-BD', {
      style: 'currency',
      currency: 'BDT',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  generateReportId(): string {
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substr(2, 9)
    return `ATL-${timestamp}-${random}`.toUpperCase()
  }
}

export const pdfReportGenerator = new PDFReportGenerator()