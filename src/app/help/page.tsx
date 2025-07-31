'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  HelpCircle,
  Search,
  Book,
  MessageCircle,
  Phone,
  Mail,
  Video,
  Download,
  ChevronDown,
  ChevronRight,
  Star,
  ThumbsUp,
  ThumbsDown,
  ExternalLink,
  PlayCircle,
  FileText,
  Users,
  Zap,
  Shield,
  CreditCard,
  Smartphone
} from 'lucide-react'

interface FAQItem {
  id: string
  question: string
  answer: string
  category: string
  helpful: number
  notHelpful: number
}

interface GuideItem {
  id: string
  title: string
  description: string
  type: 'article' | 'video' | 'pdf'
  duration?: string
  category: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  popular: boolean
}

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null)
  const [contactMethod, setContactMethod] = useState<'chat' | 'email' | 'phone'>('chat')

  const categories = [
    { id: 'all', label: 'All Topics', icon: Book },
    { id: 'getting-started', label: 'Getting Started', icon: Zap },
    { id: 'trip-planning', label: 'Trip Planning', icon: Users },
    { id: 'health-tracking', label: 'Health Tracking', icon: Shield },
    { id: 'payments', label: 'Payments & Billing', icon: CreditCard },
    { id: 'mobile-app', label: 'Mobile App', icon: Smartphone },
    { id: 'account', label: 'Account Management', icon: Users }
  ]

  const faqs: FAQItem[] = [
    {
      id: '1',
      question: 'How do I create my first trip?',
      answer: 'To create your first trip, use the AI Trip Planner on your homepage. Simply start chatting about your destination, dates, budget, and preferences. Our AI will generate a personalized itinerary for you within minutes.',
      category: 'getting-started',
      helpful: 156,
      notHelpful: 12
    },
    {
      id: '2',
      question: 'How does the AI trip planning work?',
      answer: 'Our AI analyzes your preferences, budget, travel dates, and health profile to create personalized itineraries. It uses real-time data from multiple sources including flights, hotels, and activities to provide the best recommendations. The AI learns from your feedback to improve future suggestions.',
      category: 'trip-planning',
      helpful: 203,
      notHelpful: 8
    },
    {
      id: '3',
      question: 'Can I connect my fitness tracker?',
      answer: 'Yes! We support integration with Fitbit, Apple Health, Google Fit, and other popular fitness trackers. Go to Settings > Connected Devices to link your wearables and automatically sync your health data.',
      category: 'health-tracking',
      helpful: 145,
      notHelpful: 15
    },
    {
      id: '4',
      question: 'What payment methods do you accept?',
      answer: 'We accept all major credit cards (Visa, Mastercard, American Express), PayPal, and bank transfers. All payments are processed securely using industry-standard encryption.',
      category: 'payments',
      helpful: 189,
      notHelpful: 6
    },
    {
      id: '5',
      question: 'Is there a mobile app available?',
      answer: 'Yes, our mobile app is available for both iOS and Android. Download it from the App Store or Google Play Store. The app includes all features from the web version plus offline access to your itineraries.',
      category: 'mobile-app',
      helpful: 234,
      notHelpful: 11
    },
    {
      id: '6',
      question: 'How do I cancel my subscription?',
      answer: 'You can cancel your subscription anytime from Settings > Billing. Your account will remain active until the end of your current billing period. All your data will be preserved for 30 days after cancellation.',
      category: 'account',
      helpful: 167,
      notHelpful: 23
    }
  ]

  const guides: GuideItem[] = [
    {
      id: '1',
      title: 'Complete Guide to AI Trip Planning',
      description: 'Learn how to use our AI to create perfect itineraries tailored to your preferences and budget.',
      type: 'article',
      category: 'getting-started',
      difficulty: 'beginner',
      popular: true
    },
    {
      id: '2',
      title: 'Health Tracking Setup Tutorial',
      description: 'Step-by-step video guide to connecting your fitness trackers and setting up health goals.',
      type: 'video',
      duration: '8 min',
      category: 'health-tracking',
      difficulty: 'beginner',
      popular: true
    },
    {
      id: '3',
      title: 'Advanced Trip Customization',
      description: 'Master advanced features like custom activities, dietary restrictions, and accessibility preferences.',
      type: 'article',
      category: 'trip-planning',
      difficulty: 'advanced',
      popular: false
    },
    {
      id: '4',
      title: 'Mobile App Quick Start Guide',
      description: 'Downloadable PDF guide to get started with our mobile app features.',
      type: 'pdf',
      category: 'mobile-app',
      difficulty: 'beginner',
      popular: true
    },
    {
      id: '5',
      title: 'Payment and Billing FAQ',
      description: 'Everything you need to know about subscriptions, billing, and payment security.',
      type: 'article',
      category: 'payments',
      difficulty: 'beginner',
      popular: false
    }
  ]

  const filteredFAQs = faqs.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const filteredGuides = guides.filter(guide => {
    const matchesSearch = guide.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         guide.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || guide.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const toggleFAQ = (id: string) => {
    setExpandedFAQ(expandedFAQ === id ? null : id)
  }

  const rateFAQ = (id: string, helpful: boolean) => {
    // In real implementation, this would send feedback to backend
    alert(`Thank you for your feedback!`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm" style={{ height: '80px' }}>
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-brand-green to-brand-seafoam rounded-xl flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900">Help Center</h1>
              <p className="text-sm text-gray-600">Find answers and get support</p>
            </div>
          </div>
          
          <button 
            onClick={() => window.location.href = '/home'}
            className="text-brand-green hover:text-brand-seafoam transition-colors font-medium"
          >
            ← Back to Home
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl font-bold text-gray-900 mb-4">How can we help you?</h2>
          <p className="text-xl text-gray-600 mb-8">Search our knowledge base or contact our support team</p>
          
          {/* Search Bar */}
          <div className="max-w-2xl mx-auto relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for help articles, guides, or FAQs..."
              className="w-full pl-12 pr-4 py-4 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-brand-green focus:border-transparent text-lg"
            />
          </div>
        </motion.div>

        {/* Category Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-wrap gap-2 mb-8 justify-center"
        >
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors ${
                selectedCategory === category.id
                  ? 'bg-brand-green text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              <category.icon className="w-4 h-4" />
              {category.label}
            </button>
          ))}
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* FAQ Section */}
          <div className="lg:col-span-2 space-y-8">
            {/* Popular Guides */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-3xl shadow-xl p-8"
            >
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Popular Guides</h3>
              
              <div className="grid md:grid-cols-2 gap-4">
                {filteredGuides.filter(guide => guide.popular).map((guide) => (
                  <div key={guide.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        {guide.type === 'video' && <PlayCircle className="w-5 h-5 text-blue-600" />}
                        {guide.type === 'article' && <FileText className="w-5 h-5 text-blue-600" />}
                        {guide.type === 'pdf' && <Download className="w-5 h-5 text-blue-600" />}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-1">{guide.title}</h4>
                        <p className="text-sm text-gray-600 mb-2">{guide.description}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span className={`px-2 py-1 rounded-full ${
                            guide.difficulty === 'beginner' ? 'bg-green-100 text-green-800' :
                            guide.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {guide.difficulty}
                          </span>
                          {guide.duration && <span>• {guide.duration}</span>}
                          <ExternalLink className="w-3 h-3" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* FAQ Section */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-3xl shadow-xl p-8"
            >
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h3>
              
              <div className="space-y-4">
                {filteredFAQs.map((faq) => (
                  <div key={faq.id} className="border border-gray-200 rounded-xl">
                    <button
                      onClick={() => toggleFAQ(faq.id)}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                    >
                      <span className="font-medium text-gray-900">{faq.question}</span>
                      {expandedFAQ === faq.id ? (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                    
                    {expandedFAQ === faq.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="px-4 pb-4"
                      >
                        <p className="text-gray-600 mb-4">{faq.answer}</p>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <span className="text-sm text-gray-500">Was this helpful?</span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => rateFAQ(faq.id, true)}
                                className="flex items-center gap-1 text-green-600 hover:text-green-700 text-sm"
                              >
                                <ThumbsUp className="w-4 h-4" />
                                {faq.helpful}
                              </button>
                              <button
                                onClick={() => rateFAQ(faq.id, false)}
                                className="flex items-center gap-1 text-red-600 hover:text-red-700 text-sm"
                              >
                                <ThumbsDown className="w-4 h-4" />
                                {faq.notHelpful}
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>

            {/* All Guides */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-3xl shadow-xl p-8"
            >
              <h3 className="text-2xl font-bold text-gray-900 mb-6">All Guides & Tutorials</h3>
              
              <div className="space-y-4">
                {filteredGuides.map((guide) => (
                  <div key={guide.id} className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:shadow-md transition-shadow cursor-pointer">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      {guide.type === 'video' && <PlayCircle className="w-6 h-6 text-blue-600" />}
                      {guide.type === 'article' && <FileText className="w-6 h-6 text-blue-600" />}
                      {guide.type === 'pdf' && <Download className="w-6 h-6 text-blue-600" />}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900">{guide.title}</h4>
                        {guide.popular && (
                          <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{guide.description}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="capitalize">{guide.type}</span>
                        {guide.duration && <span>• {guide.duration}</span>}
                        <span>• {guide.difficulty}</span>
                      </div>
                    </div>
                    
                    <ExternalLink className="w-5 h-5 text-gray-400" />
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Contact Support Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-3xl shadow-xl p-6"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h3>
              
              <div className="space-y-3">
                <button className="w-full flex items-center gap-3 p-3 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition-colors">
                  <Video className="w-5 h-5" />
                  Watch Tutorial Videos
                </button>
                
                <button className="w-full flex items-center gap-3 p-3 bg-green-50 text-green-700 rounded-xl hover:bg-green-100 transition-colors">
                  <Download className="w-5 h-5" />
                  Download Mobile App
                </button>
                
                <button className="w-full flex items-center gap-3 p-3 bg-purple-50 text-purple-700 rounded-xl hover:bg-purple-100 transition-colors">
                  <Book className="w-5 h-5" />
                  View User Manual
                </button>
              </div>
            </motion.div>

            {/* Contact Support */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-3xl shadow-xl p-6"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-4">Contact Support</h3>
              
              <div className="space-y-3 mb-6">
                <button
                  onClick={() => setContactMethod('chat')}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                    contactMethod === 'chat'
                      ? 'bg-brand-green text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <MessageCircle className="w-5 h-5" />
                  Live Chat
                </button>
                
                <button
                  onClick={() => setContactMethod('email')}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                    contactMethod === 'email'
                      ? 'bg-brand-green text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Mail className="w-5 h-5" />
                  Email Support
                </button>
                
                <button
                  onClick={() => setContactMethod('phone')}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                    contactMethod === 'phone'
                      ? 'bg-brand-green text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Phone className="w-5 h-5" />
                  Phone Support
                </button>
              </div>

              {contactMethod === 'chat' && (
                <div className="bg-green-50 p-4 rounded-xl">
                  <h4 className="font-semibold text-green-900 mb-2">Live Chat Support</h4>
                  <p className="text-sm text-green-700 mb-3">
                    Available 24/7. Average response time: 2 minutes
                  </p>
                  <button className="w-full bg-brand-green text-white py-2 px-4 rounded-lg hover:bg-opacity-90 transition-colors">
                    Start Chat
                  </button>
                </div>
              )}

              {contactMethod === 'email' && (
                <div className="bg-blue-50 p-4 rounded-xl">
                  <h4 className="font-semibold text-blue-900 mb-2">Email Support</h4>
                  <p className="text-sm text-blue-700 mb-3">
                    Response within 24 hours. Send detailed questions for best help.
                  </p>
                  <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
                    Send Email
                  </button>
                </div>
              )}

              {contactMethod === 'phone' && (
                <div className="bg-purple-50 p-4 rounded-xl">
                  <h4 className="font-semibold text-purple-900 mb-2">Phone Support</h4>
                  <p className="text-sm text-purple-700 mb-3">
                    Available Mon-Fri 9AM-6PM GMT. For urgent issues only.
                  </p>
                  <div className="text-center">
                    <p className="text-lg font-bold text-purple-900 mb-2">+44 20 7123 4567</p>
                    <button className="bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors">
                      Call Now
                    </button>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Community */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-3xl shadow-xl p-6"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-4">Community</h3>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <Users className="w-5 h-5 text-gray-600" />
                  <div>
                    <div className="font-medium text-gray-900">User Forum</div>
                    <div className="text-sm text-gray-600">Join discussions with other travelers</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <MessageCircle className="w-5 h-5 text-gray-600" />
                  <div>
                    <div className="font-medium text-gray-900">Discord Community</div>
                    <div className="text-sm text-gray-600">Real-time chat and support</div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* System Status */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-white rounded-3xl shadow-xl p-6"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-4">System Status</h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">All Systems</span>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-green-600">Operational</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">AI Trip Planner</span>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-green-600">Operational</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Payment System</span>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-green-600">Operational</span>
                  </div>
                </div>
                
                <button className="w-full text-brand-green hover:text-brand-seafoam text-sm font-medium pt-2">
                  View Status Page →
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}