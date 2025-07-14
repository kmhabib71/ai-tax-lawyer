'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from 'next/link'

interface Conversation {
  id: string
  title: string
  lastMessage: string
  lastUpdated: Date
  messageCount: number
}

interface UserProfile {
  name: string
  email: string
  userType: string
  annualIncome: string
  taxYear: string
  primaryGoal: string
  completedAt: string
}

export default function DashboardPage() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [stats, setStats] = useState({
    totalConversations: 0,
    questionsAsked: 0,
    potentialSavings: 0
  })

  useEffect(() => {
    // Load user profile from onboarding
    const onboardingData = localStorage.getItem('onboarding')
    if (onboardingData) {
      setUserProfile(JSON.parse(onboardingData))
    }

    // Load conversations from localStorage (in production, this would be from API)
    const savedConversations = localStorage.getItem('conversations')
    if (savedConversations) {
      setConversations(JSON.parse(savedConversations))
    }

    // Mock stats (in production, this would be calculated from actual data)
    setStats({
      totalConversations: 3,
      questionsAsked: 12,
      potentialSavings: 25000
    })
  }, [])

  const formatUserType = (type: string) => {
    switch (type) {
      case 'salaried':
        return 'Salaried Employee'
      case 'freelancer':
        return 'Freelancer'
      case 'business':
        return 'Business Owner'
      case 'landlord':
        return 'Landlord'
      default:
        return type
    }
  }

  const formatIncomeRange = (range: string) => {
    switch (range) {
      case 'below-300000':
        return 'Below 3,00,000 BDT'
      case '300000-500000':
        return '3,00,000 - 5,00,000 BDT'
      case '500000-1000000':
        return '5,00,000 - 10,00,000 BDT'
      case '1000000-2000000':
        return '10,00,000 - 20,00,000 BDT'
      case 'above-2000000':
        return 'Above 20,00,000 BDT'
      default:
        return range
    }
  }

  const mockConversations: Conversation[] = [
    {
      id: '1',
      title: 'Tax Deductions for Salaried Employees',
      lastMessage: 'You can claim house rent allowance, conveyance allowance, and medical allowance...',
      lastUpdated: new Date('2025-01-14T10:30:00'),
      messageCount: 8
    },
    {
      id: '2',
      title: 'Tax Calculation for FY 2024-25',
      lastMessage: 'Based on your income, your tax liability would be approximately...',
      lastUpdated: new Date('2025-01-13T15:45:00'),
      messageCount: 5
    },
    {
      id: '3',
      title: 'Investment Options for Tax Savings',
      lastMessage: 'You can invest in DPS, LIC, or approved mutual funds to get tax benefits...',
      lastUpdated: new Date('2025-01-12T09:15:00'),
      messageCount: 12
    }
  ]

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              Welcome back{userProfile ? `, ${userProfile.name}` : ''}!
            </h1>
            <p className="text-gray-600">
              Your AI Tax Lawyer Dashboard
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Total Conversations</CardDescription>
                <CardTitle className="text-2xl">{stats.totalConversations}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  +1 from last week
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Questions Asked</CardDescription>
                <CardTitle className="text-2xl">{stats.questionsAsked}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Across all conversations
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Potential Savings</CardDescription>
                <CardTitle className="text-2xl">৳{stats.potentialSavings.toLocaleString()}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Based on optimization tips
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            
            {/* Recent Conversations */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Conversations</CardTitle>
                  <CardDescription>
                    Your latest tax consultations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {mockConversations.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500 mb-4">
                        No conversations yet
                      </p>
                      <Link href="/chat">
                        <Button className="bg-blue-600 hover:bg-blue-700">
                          Start Your First Consultation
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {mockConversations.map((conversation) => (
                        <div
                          key={conversation.id}
                          className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-semibold text-gray-800">
                              {conversation.title}
                            </h3>
                            <span className="text-xs text-gray-500">
                              {conversation.lastUpdated.toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">
                            {conversation.lastMessage}
                          </p>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-500">
                              {conversation.messageCount} messages
                            </span>
                            <Link href={`/chat?conversation=${conversation.id}`}>
                              <Button variant="outline" size="sm">
                                Continue
                              </Button>
                            </Link>
                          </div>
                        </div>
                      ))}
                      
                      <div className="pt-4 border-t">
                        <Link href="/chat">
                          <Button className="w-full bg-blue-600 hover:bg-blue-700">
                            Start New Consultation
                          </Button>
                        </Link>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* User Profile */}
            <div className="space-y-6">
              {userProfile && (
                <Card>
                  <CardHeader>
                    <CardTitle>Your Profile</CardTitle>
                    <CardDescription>
                      Tax profile information
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Taxpayer Type</p>
                      <p className="text-sm text-gray-600">{formatUserType(userProfile.userType)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Annual Income</p>
                      <p className="text-sm text-gray-600">{formatIncomeRange(userProfile.annualIncome)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Tax Year</p>
                      <p className="text-sm text-gray-600">{userProfile.taxYear}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Primary Goal</p>
                      <p className="text-sm text-gray-600 capitalize">{userProfile.primaryGoal.replace('-', ' ')}</p>
                    </div>
                    <div className="pt-2">
                      <Button variant="outline" size="sm" className="w-full">
                        Edit Profile
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Link href="/chat">
                    <Button variant="outline" className="w-full justify-start">
                      💬 Ask Tax Question
                    </Button>
                  </Link>
                  <Link href="/calculator">
                    <Button variant="outline" className="w-full justify-start">
                      🧮 Tax Calculator
                    </Button>
                  </Link>
                  <Link href="/documents">
                    <Button variant="outline" className="w-full justify-start">
                      📄 Upload Documents
                    </Button>
                  </Link>
                  <Link href="/reports">
                    <Button variant="outline" className="w-full justify-start">
                      📊 Tax Reports
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Subscription Status */}
              <Card>
                <CardHeader>
                  <CardTitle>Subscription</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Plan</span>
                      <span className="text-sm text-gray-600">Free</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Queries Left</span>
                      <span className="text-sm text-gray-600">3/5</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: '60%' }}></div>
                    </div>
                    <Button variant="outline" size="sm" className="w-full">
                      Upgrade to Pro
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}