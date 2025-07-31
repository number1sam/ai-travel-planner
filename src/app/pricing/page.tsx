'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Zap, Crown, MessageCircle, ChevronDown, ChevronUp, Star, Users, Calendar, Headphones } from 'lucide-react'

interface PricingPlan {
  id: string
  name: string
  price: number
  popular?: boolean
  features: string[]
  buttonText: string
  gradient: string
  icon: React.ComponentType<any>
}

interface FAQ {
  id: string
  question: string
  answer: string
}

const pricingPlans: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    features: [
      '1 trip per month',
      'Standard itineraries',
      'Basic health tips',
      'Email support',
      'Community access'
    ],
    buttonText: 'Get Started Free',
    gradient: 'from-gray-500 to-gray-600',
    icon: Users
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 9.99,
    popular: true,
    features: [
      'Unlimited trip planning',
      'Personalized AI itineraries',
      'Advanced health tracking',
      'Real-time flight updates',
      'Priority email support',
      'Offline itinerary access',
      'Weather integration',
      'Budget optimization'
    ],
    buttonText: 'Start Premium',
    gradient: 'from-blue-500 to-blue-600',
    icon: Zap
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 19.99,
    features: [
      'Everything in Premium',
      'Priority support (24/7)',
      'Exclusive discounts (up to 15%)',
      'Concierge assistance',
      'White-glove trip planning',
      'Group trip coordination',
      'Loyalty program access',
      'Custom dietary preferences',
      'Emergency travel assistance'
    ],
    buttonText: 'Go Pro',
    gradient: 'from-purple-500 to-purple-600',
    icon: Crown
  }
]

const faqs: FAQ[] = [
  {
    id: '1',
    question: 'Can I cancel my subscription at any time?',
    answer: 'Yes, you can cancel your subscription at any time. If you cancel, you\'ll continue to have access to premium features until the end of your current billing period. No cancellation fees apply.'
  },
  {
    id: '2',
    question: 'What payment methods are accepted?',
    answer: 'We accept all major credit cards (Visa, MasterCard, American Express), PayPal, and bank transfers. All payments are processed securely through Stripe and PayPal\'s encrypted payment systems.'
  },
  {
    id: '3',
    question: 'Is there a free trial for premium plans?',
    answer: 'Yes! Both Premium and Pro plans come with a 14-day free trial. You can cancel anytime during the trial period without being charged. No credit card required to start the trial.'
  },
  {
    id: '4',
    question: 'What happens to my trips if I downgrade?',
    answer: 'Your existing trips and itineraries will remain accessible. However, you\'ll lose access to premium features like real-time updates and advanced health tracking for future trips. Past trip data is never deleted.'
  },
  {
    id: '5',
    question: 'Do you offer student or corporate discounts?',
    answer: 'Yes! We offer 50% off for students with valid .edu email addresses and custom pricing for corporate accounts with 10+ users. Contact our sales team for enterprise pricing.'
  },
  {
    id: '6',
    question: 'How does the AI personalization work?',
    answer: 'Our AI analyzes your travel history, health preferences, budget constraints, and feedback to create increasingly personalized recommendations. The more you use the platform, the better it gets at understanding your unique travel style.'
  }
]

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(false)
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState<string | null>(null)

  const handleSelectPlan = async (planId: string) => {
    if (planId === 'free') {
      window.location.href = '/auth'
      return
    }

    setIsProcessing(planId)

    try {
      const response = await fetch('/api/checkout/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId,
          billingPeriod: isAnnual ? 'annual' : 'monthly'
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create checkout session')
      }

      const { url } = await response.json()
      window.location.href = url
    } catch (error) {
      console.error('Checkout error:', error)
      alert('Something went wrong. Please try again.')
    } finally {
      setIsProcessing(null)
    }
  }

  const toggleFAQ = (faqId: string) => {
    setExpandedFAQ(expandedFAQ === faqId ? null : faqId)
  }

  const getDiscountedPrice = (price: number) => {
    return isAnnual ? price * 10 : price // 2 months free when paying annually
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => window.location.href = '/'}
              className="text-brand-green hover:text-brand-seafoam transition-colors"
            >
              ← Back to Home
            </button>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-brand-green to-brand-seafoam rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-sm">AT</span>
              </div>
              <span className="font-bold text-gray-900">AI Travel Planner</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-16">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Choose the Plan That Fits Your Travel Style
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto" style={{ fontSize: '20px' }}>
            Whether you're an occasional traveler or a frequent flyer, we have a plan that's right for you.
          </p>
        </motion.div>

        {/* Billing Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex items-center justify-center mb-12"
        >
          <div className="bg-white rounded-2xl p-2 shadow-lg border border-gray-200">
            <div className="flex items-center gap-4">
              <span className={`px-4 py-2 font-medium ${!isAnnual ? 'text-gray-900' : 'text-gray-500'}`}>
                Monthly
              </span>
              <button
                onClick={() => setIsAnnual(!isAnnual)}
                className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-green focus:ring-offset-2"
                style={{ backgroundColor: isAnnual ? '#0E7F76' : '#D1D5DB' }}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isAnnual ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className={`px-4 py-2 font-medium ${isAnnual ? 'text-gray-900' : 'text-gray-500'}`}>
                Annual
                <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                  Save 17%
                </span>
              </span>
            </div>
          </div>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {pricingPlans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 * index }}
              whileHover={{ y: -6, boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)' }}
              className={`relative bg-white rounded-3xl shadow-lg border border-gray-200 p-8 ${
                plan.popular ? 'ring-2 ring-brand-green' : ''
              }`}
              style={{ width: '320px', height: '450px', margin: '0 auto' }}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-gradient-to-r from-brand-green to-brand-seafoam text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-1">
                    <Star className="w-4 h-4" />
                    Most Popular
                  </div>
                </div>
              )}

              {/* Plan Header */}
              <div className="text-center mb-8">
                <div className={`w-16 h-16 bg-gradient-to-r ${plan.gradient} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                  <plan.icon className="w-8 h-8 text-white" />
                </div>
                
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                
                <div className="text-4xl font-bold text-gray-900 mb-1">
                  {plan.price === 0 ? (
                    'Free'
                  ) : (
                    <>
                      £{isAnnual ? getDiscountedPrice(plan.price).toFixed(0) : plan.price}
                      <span className="text-lg font-normal text-gray-500">
                        /{isAnnual ? 'year' : 'month'}
                      </span>
                    </>
                  )}
                </div>
                
                {isAnnual && plan.price > 0 && (
                  <div className="text-sm text-gray-500 line-through">
                    £{(plan.price * 12).toFixed(0)}/year
                  </div>
                )}
              </div>

              {/* Features List */}
              <div className="space-y-3 mb-8">
                {plan.features.map((feature, featureIndex) => (
                  <div key={featureIndex} className="flex items-start gap-3">
                    <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-green-600" />
                    </div>
                    <span className="text-gray-700 text-sm">{feature}</span>
                  </div>
                ))}
              </div>

              {/* CTA Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSelectPlan(plan.id)}
                disabled={isProcessing === plan.id}
                className={`w-full font-semibold rounded-2xl transition-all duration-300 flex items-center justify-center ${
                  plan.popular
                    ? 'bg-gradient-to-r from-brand-green to-brand-seafoam text-white hover:opacity-90'
                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                }`}
                style={{ height: '50px' }}
              >
                {isProcessing === plan.id ? (
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  plan.buttonText
                )}
              </motion.button>
            </motion.div>
          ))}
        </div>

        {/* FAQ Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="bg-white rounded-3xl shadow-lg p-8 mb-16"
        >
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">
            Frequently Asked Questions
          </h2>
          
          <div className="max-w-3xl mx-auto space-y-4">
            {faqs.map((faq) => (
              <motion.div
                key={faq.id}
                initial={false}
                className="border border-gray-200 rounded-2xl overflow-hidden"
              >
                <button
                  onClick={() => toggleFAQ(faq.id)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors duration-200"
                >
                  <span className="font-medium text-gray-900 pr-4">{faq.question}</span>
                  {expandedFAQ === faq.id ? (
                    <ChevronUp className="w-5 h-5 text-gray-500 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />
                  )}
                </button>
                
                <AnimatePresence>
                  {expandedFAQ === faq.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-4 text-gray-600 leading-relaxed">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Support Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="bg-gradient-to-r from-brand-green to-brand-seafoam rounded-3xl p-8 text-white text-center"
        >
          <MessageCircle className="w-16 h-16 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">Need Help?</h2>
          <p className="text-lg mb-6 opacity-90">
            Our team is here to help you choose the perfect plan for your travel needs.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => window.location.href = '/contact'}
              className="bg-white text-brand-green px-6 py-3 rounded-xl font-medium hover:bg-gray-100 transition-colors duration-200"
            >
              Contact Support
            </button>
            
            <button
              onClick={() => {
                // Open live chat - would integrate with chat system
                alert('Live chat would open here!')
              }}
              className="bg-white bg-opacity-20 text-white border border-white border-opacity-30 px-6 py-3 rounded-xl font-medium hover:bg-opacity-30 transition-colors duration-200 flex items-center justify-center gap-2"
            >
              <Headphones className="w-4 h-4" />
              Live Chat
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}