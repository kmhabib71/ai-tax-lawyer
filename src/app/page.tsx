'use client';

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { useTranslation } from "@/contexts/LanguageContext"

export default function Home() {
  const { t } = useTranslation();
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              {t('home.title')}
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto">
              {t('home.subtitle')}
            </p>
          </div>
          
          <div className="space-y-6">
            <p className="text-lg text-gray-700 max-w-4xl mx-auto leading-relaxed">
              {t('home.description')}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link href="/chat">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white">
                  {t('home.startConsultation')}
                </Button>
              </Link>
              <Link href="/onboarding">
                <Button size="lg" variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-50">
                  {t('home.getStarted')}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* User Types Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
            Who We Serve
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Tailored tax solutions for every type of taxpayer in Bangladesh
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg">{t('chat.salariedEmployee')}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Maximize your deductions and optimize your tax savings with personalized advice
              </CardDescription>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg">{t('chat.freelancer')}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Handle complex income reporting and foreign remittance taxation
              </CardDescription>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg">{t('chat.businessOwner')}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Corporate tax planning and compliance made simple
              </CardDescription>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg">{t('chat.landlord')}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Legal optimization of rental property taxes and compliance
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-white py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
              {t('home.features.title')}
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Powered by advanced AI and comprehensive knowledge of Bangladesh tax law
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Accurate & Reliable</h3>
              <p className="text-gray-600">
                Based on official NBR rules, SROs, and Income Tax Ordinance with real-time updates
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Cost-Effective</h3>
              <p className="text-gray-600">
                90% cheaper than traditional CA services with 24/7 availability
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Lightning Fast</h3>
              <p className="text-gray-600">
                Get instant answers to your tax questions with comprehensive explanations
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-blue-600 to-indigo-600 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Optimize Your Taxes?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join thousands of Bangladeshi taxpayers who trust {t('home.title')} for their tax planning
          </p>
          <Link href="/onboarding">
            <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100">
              {t('home.getStarted')}
            </Button>
          </Link>
        </div>
      </section>
    </main>
  )
}