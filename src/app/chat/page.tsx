'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Message {
  id: string
  content: string
  sender: 'user' | 'ai'
  timestamp: Date
  sources?: Array<{
    title: string
    url: string
    excerpt: string
  }>
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'Hello! I\'m your AI Tax Lawyer assistant. I can help you with Bangladesh tax laws, deductions, and compliance. What would you like to know about your taxes?',
      sender: 'ai',
      timestamp: new Date()
    }
  ])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [userProfile, setUserProfile] = useState<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Load user profile from onboarding
    const onboardingData = localStorage.getItem('onboarding')
    if (onboardingData) {
      setUserProfile(JSON.parse(onboardingData))
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      sender: 'user',
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)

    // Create AI message with empty content for streaming
    const aiMessageId = (Date.now() + 1).toString()
    const aiMessage: Message = {
      id: aiMessageId,
      content: '',
      sender: 'ai',
      timestamp: new Date(),
      sources: []
    }
    setMessages(prev => [...prev, aiMessage])

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputMessage,
          userType: userProfile?.userType || 'other',
          conversationHistory: messages,
          stream: true
        })
      })

      if (!response.ok) {
        throw new Error('Failed to get response')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No response stream')
      }

      let buffer = ''
      
      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break
        
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Keep incomplete line in buffer
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.slice(6) // Remove 'data: ' prefix
              if (jsonStr.trim()) {
                const data = JSON.parse(jsonStr)
                
                if (data.type === 'chunk' && data.content) {
                  // Update the AI message content
                  setMessages(prev => prev.map(msg => 
                    msg.id === aiMessageId 
                      ? { ...msg, content: msg.content + data.content }
                      : msg
                  ))
                } else if (data.type === 'complete') {
                  // Update with final metadata
                  setMessages(prev => prev.map(msg => 
                    msg.id === aiMessageId 
                      ? { ...msg, sources: data.metadata?.sources || [] }
                      : msg
                  ))
                } else if (data.type === 'error') {
                  // Handle error
                  setMessages(prev => prev.map(msg => 
                    msg.id === aiMessageId 
                      ? { ...msg, content: data.content }
                      : msg
                  ))
                }
              }
            } catch (parseError) {
              console.error('Error parsing streaming data:', parseError)
            }
          }
        }
      }

    } catch (error) {
      console.error('Error sending message:', error)
      let errorContent = 'Sorry, I encountered an error. Please try again.'
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorContent = 'Request timed out. The AI is taking longer than expected. Please try a simpler question or try again later.'
        } else if (error.message.includes('Failed to fetch')) {
          errorContent = 'Network error. Please check your internet connection and try again.'
        }
      }
      
      // Update the AI message with error content
      setMessages(prev => prev.map(msg => 
        msg.id === aiMessageId 
          ? { ...msg, content: errorContent }
          : msg
      ))
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          
          {/* Header */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">⚖️</span>
                AI Tax Lawyer
                {userProfile && (
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    - {userProfile.userType === 'salaried' ? 'Salaried Employee' : 
                        userProfile.userType === 'freelancer' ? 'Freelancer' :
                        userProfile.userType === 'business' ? 'Business Owner' : 'Landlord'}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
          </Card>

          {/* Chat Messages */}
          <Card className="mb-6">
            <CardContent className="p-0">
              <div className="h-96 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.sender === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      
                      {message.sources && message.sources.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <p className="text-xs text-gray-600 mb-1">Sources:</p>
                          {message.sources.map((source, index) => (
                            <div key={index} className="text-xs text-gray-500 mb-1">
                              • {source.title}
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <p className="text-xs text-gray-500 mt-1">
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 text-gray-800 max-w-xs lg:max-w-md px-4 py-2 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        </div>
                        <span className="text-sm">AI is typing...</span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            </CardContent>
          </Card>

          {/* Input Area */}
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-2">
                <textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me anything about Bangladesh tax law..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={3}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={isLoading || !inputMessage.trim()}
                  className="px-6 bg-blue-600 hover:bg-blue-700"
                >
                  Send
                </Button>
              </div>
              
              {/* Quick Actions */}
              <div className="mt-4 space-y-2">
                <p className="text-sm text-gray-600">Quick questions:</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    "What deductions can I claim?",
                    "How to calculate my tax?",
                    "What is the tax rate for my income?",
                    "How to file my return?"
                  ].map((question) => (
                    <Button
                      key={question}
                      variant="outline"
                      size="sm"
                      onClick={() => setInputMessage(question)}
                      className="text-xs"
                    >
                      {question}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Legal Disclaimer */}
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Legal Disclaimer:</strong> This AI provides general tax guidance based on Bangladesh tax laws. 
              For complex situations or official filing, please consult with a qualified tax professional.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}