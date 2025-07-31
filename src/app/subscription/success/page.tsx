'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle, Download, Share2, Calendar, CreditCard, ArrowRight } from 'lucide-react'
import { useSearchParams } from 'next/navigation'

interface SubscriptionDetails {
  planName: string
  amount: number
  currency: string
  billingPeriod: string
  nextBilling: string
  features: string[]
}

export default function SubscriptionSuccessPage() {
  const [subscriptionDetails, setSubscriptionDetails] = useState<SubscriptionDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')

  useEffect(() => {
    const fetchSubscriptionDetails = async () => {
      if (!sessionId) {
        setIsLoading(false)
        return
      }

      try {
        const response = await fetch(`/api/subscription/details?session_id=${sessionId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })

        if (response.ok) {
          const data = await response.json()
          setSubscriptionDetails(data)
        }
      } catch (error) {
        console.error('Error fetching subscription details:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchSubscriptionDetails()
  }, [sessionId])

  const handleDownloadReceipt = async () => {
    try {
      const response = await fetch(`/api/subscription/receipt?session_id=${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `receipt-${sessionId}.pdf`
        a.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Error downloading receipt:', error)
    }
  }

  const handleShareSuccess = () => {
    const shareData = {
      title: 'AI Travel & Health Planner',
      text: 'I just upgraded to get personalized AI trip planning! Check it out:',
      url: window.location.origin
    }

    if (navigator.share) {
      navigator.share(shareData)
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`)
      alert('Link copied to clipboard!')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-brand-green border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Processing your subscription...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-brand-green to-brand-seafoam rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-sm">AT</span>
              </div>
              <span className="font-bold text-gray-900">AI Travel Planner</span>
            </div>
            
            <button 
              onClick={() => window.location.href = '/home'}
              className="text-brand-green hover:text-brand-seafoam transition-colors font-medium"
            >
              Go to Home →
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-16">
        {/* Success Animation */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ 
            type: "spring", 
            stiffness: 200, 
            damping: 15,
            delay: 0.2 
          }}
          className="text-center mb-12"
        >
          <div className="w-24 h-24 bg-gradient-to-r from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-white" />
          </div>
          
          {/* Confetti Animation */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full"
                initial={{ 
                  x: window.innerWidth / 2, 
                  y: window.innerHeight / 2,
                  scale: 0 
                }}
                animate={{ 
                  x: Math.random() * window.innerWidth,
                  y: window.innerHeight + 100,
                  scale: 1,
                  rotate: 360
                }}
                transition={{ 
                  duration: 3,
                  delay: i * 0.1,
                  ease: "easeOut"
                }}
                style={{
                  left: Math.random() * window.innerWidth,
                  top: -10
                }}
              />
            ))}
          </div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-5xl font-bold text-gray-900 mb-4"
            style={{ fontSize: '48px' }}
          >
            Your Trip is Ready!
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="text-xl text-gray-600"
          >
            Welcome to personalized AI travel planning! Your subscription is now active.
          </motion.p>
        </motion.div>

        {/* Subscription Details Card */}
        {subscriptionDetails && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="bg-white rounded-3xl shadow-2xl p-8 mb-8"
          >
            <div className="grid md:grid-cols-2 gap-8">
              {/* Plan Details */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Subscription Details</h2>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-gray-100">
                    <span className="text-gray-600">Plan</span>
                    <span className="font-semibold text-gray-900">{subscriptionDetails.planName}</span>
                  </div>
                  
                  <div className="flex items-center justify-between py-3 border-b border-gray-100">
                    <span className="text-gray-600">Amount</span>
                    <span className="font-semibold text-gray-900">
                      {subscriptionDetails.currency}{subscriptionDetails.amount}
                      <span className="text-sm text-gray-500">/{subscriptionDetails.billingPeriod}</span>
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between py-3 border-b border-gray-100">
                    <span className="text-gray-600">Next Billing</span>
                    <span className="font-semibold text-gray-900 flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {subscriptionDetails.nextBilling}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between py-3">
                    <span className="text-gray-600">Status</span>
                    <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                      Active
                    </span>
                  </div>
                </div>
              </div>

              {/* Features Included */}
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-6">What's Included</h3>
                
                <div className="space-y-3">
                  {subscriptionDetails.features.map((feature, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.1 + index * 0.1 }}
                      className="flex items-center gap-3"
                    >
                      <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="w-3 h-3 text-green-600" />
                      </div>
                      <span className="text-gray-700">{feature}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <button
            onClick={handleDownloadReceipt}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-gray-200 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 font-medium"
          >
            <Download className="w-5 h-5" />
            Download Receipt
          </button>

          <button
            onClick={handleShareSuccess}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-gray-200 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 font-medium"
          >
            <Share2 className="w-5 h-5" />
            Share Success
          </button>

          <button
            onClick={() => window.location.href = '/planner'}
            className="flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r from-brand-green to-brand-seafoam text-white rounded-xl hover:opacity-90 transition-opacity duration-200 font-semibold"
          >
            Start Planning
            <ArrowRight className="w-5 h-5" />
          </button>
        </motion.div>

        {/* Next Steps */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5 }}
          className="mt-16 text-center"
        >
          <h3 className="text-2xl font-bold text-gray-900 mb-4">What's Next?</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">✈️</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Plan Your First Trip</h4>
              <p className="text-sm text-gray-600">Use our AI planner to create your perfect itinerary in minutes</p>
            </div>
            
            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">💚</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Complete Health Profile</h4>
              <p className="text-sm text-gray-600">Add your health data for personalized wellness recommendations</p>
            </div>
            
            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🎯</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Set Preferences</h4>
              <p className="text-sm text-gray-600">Customize your travel style for better AI recommendations</p>
            </div>
          </div>
        </motion.div>

        {/* Support */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.7 }}
          className="mt-12 text-center"
        >
          <p className="text-gray-600 mb-4">
            Need help getting started? Our team is here to help!
          </p>
          <div className="flex justify-center gap-4">
            <a
              href="/contact"
              className="text-brand-green hover:text-brand-seafoam font-medium transition-colors"
            >
              Contact Support
            </a>
            <span className="text-gray-300">|</span>
            <a
              href="/help"
              className="text-brand-green hover:text-brand-seafoam font-medium transition-colors"
            >
              Help Center
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  )
}