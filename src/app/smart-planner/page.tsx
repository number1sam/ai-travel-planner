'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  MessageCircle, 
  X, 
  Minus, 
  Send, 
  Paperclip,
  User,
  MapPin,
  Calendar,
  Users,
  DollarSign,
  Star,
  ChevronDown,
  RefreshCw,
  Check,
  ArrowUpDown,
  Download,
  ExternalLink,
  Sparkles,
  Shield,
  Clock
} from 'lucide-react'
import BackToHomeButton from '@/components/BackToHomeButton'

interface Message {
  id: string
  text: string
  sender: 'user' | 'bot'
  timestamp: Date
  quickReplies?: string[]
}

interface PlanItem {
  id: string
  type: 'accommodation' | 'transport' | 'activity' | 'food'
  name: string
  description?: string
  whyItFits?: string[]
  price: {
    native: { amount: number, currency: string }
    usd: number
    gbp: number
  }
  details?: string
  accessibility?: string[]
}

export default function SmartPlannerPage() {
  const [currentMessage, setCurrentMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [showPlan, setShowPlan] = useState(false)
  
  const [messages, setMessages] = useState<Message[]>([])
  const [initialized, setInitialized] = useState(false)

  const [planData] = useState({
    destination: 'Rome, Italy',
    dates: 'December 15-22, 2024',
    travelers: 2,
    budget: { amount: 2500, currency: 'GBP' },
    lastUpdated: new Date(),
    sections: {
      accommodation: [
        {
          id: '1',
          type: 'accommodation' as const,
          name: 'Hotel Artemide',
          description: 'Boutique heritage hotel • Via Nazionale',
          whyItFits: ['Prime location near Termini Station', 'Quiet residential area', 'Excellent accessibility features'],
          price: {
            native: { amount: 185, currency: 'EUR' },
            usd: 198,
            gbp: 156
          },
          details: '4.3★ • 128 verified reviews • Superior room',
          accessibility: ['Step-free access', 'Elevator available', 'Accessible bathroom']
        },
        {
          id: '2',
          type: 'accommodation' as const,
          name: 'Palazzo Montemartini',
          description: 'Luxury heritage hotel • Stazione Termini',
          whyItFits: ['Historic palazzo with modern amenities', 'Michelin-recommended restaurant', 'Concierge services'],
          price: {
            native: { amount: 295, currency: 'EUR' },
            usd: 316,
            gbp: 248
          },
          details: '4.7★ • 89 verified reviews • Deluxe room'
        }
      ],
      transport: [
        {
          id: '3',
          type: 'transport' as const,
          name: 'Direct Flights LHR → FCO',
          description: 'British Airways • 2h 30m • Premium Economy',
          price: {
            native: { amount: 320, currency: 'GBP' },
            usd: 405,
            gbp: 320
          },
          details: 'per person • includes 23kg baggage'
        }
      ],
      activities: [
        {
          id: '4',
          type: 'activity' as const,
          name: 'Colosseum & Roman Forum',
          description: 'December 16 • 9:00 AM • Skip-the-line access',
          price: {
            native: { amount: 25, currency: 'EUR' },
            usd: 27,
            gbp: 21
          },
          accessibility: ['Audio guide included', 'Wheelchair accessible routes']
        },
        {
          id: '5',
          type: 'activity' as const,
          name: 'Vatican Museums & Sistine Chapel',
          description: 'December 17 • 10:00 AM • Private guided tour',
          price: {
            native: { amount: 65, currency: 'EUR' },
            usd: 70,
            gbp: 55
          }
        },
        {
          id: '6',
          type: 'activity' as const,
          name: 'Pantheon & Historic Center Walk',
          description: 'December 18 • 2:00 PM • Local expert guide',
          price: {
            native: { amount: 35, currency: 'EUR' },
            usd: 37,
            gbp: 29
          }
        }
      ],
      food: [
        {
          id: '7',
          type: 'food' as const,
          name: 'Trastevere Evening Food Tour',
          description: 'December 19 • 7:00 PM • Authentic Roman cuisine',
          price: {
            native: { amount: 85, currency: 'EUR' },
            usd: 91,
            gbp: 72
          },
          details: 'Vegetarian & gluten-free options available'
        }
      ]
    },
    totals: {
      native: { amount: 1680, currency: 'EUR' },
      usd: 1799,
      gbp: 1425
    }
  })

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!initialized) {
      const welcomeMessage: Message = {
        id: '1',
        text: "Hello! I'm your AI travel specialist. I'll create a personalized itinerary tailored to your preferences, budget, and travel style. What destination has caught your attention?",
        sender: 'bot',
        timestamp: new Date(),
        quickReplies: ['European cities', 'Asian adventure', 'Beach getaway', 'Cultural immersion']
      }
      setMessages([welcomeMessage])
      setInitialized(true)
    }
  }, [initialized])

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const handleSendMessage = () => {
    if (currentMessage.trim()) {
      const newMessage: Message = {
        id: Date.now().toString(),
        text: currentMessage,
        sender: 'user',
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, newMessage])
      setCurrentMessage('')
      setIsTyping(true)
      
      // Simulate bot response
      setTimeout(() => {
        setIsTyping(false)
        const botResponse: Message = {
          id: (Date.now() + 1).toString(),
          text: "Excellent choice! I've curated a comprehensive itinerary that balances cultural immersion, comfort, and value. Please review the detailed plan below with accommodations, activities, and pricing in multiple currencies.",
          sender: 'bot',
          timestamp: new Date(),
          quickReplies: ['Modify budget', 'Add luxury options', 'Include more activities', 'Adjust dates']
        }
        setMessages(prev => [...prev, botResponse])
        setShowPlan(true)
      }, 1800)
    }
  }

  const handleQuickReply = (reply: string) => {
    setCurrentMessage(reply)
    handleSendMessage()
  }

  const formatPrice = (amount: number, currency: string) => {
    const symbols = { EUR: '€', USD: '$', GBP: '£' }
    return `${symbols[currency as keyof typeof symbols] || currency}${amount.toLocaleString()}`
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <BackToHomeButton />
      <div className="w-full max-w-6xl mx-auto">
        {/* Chat Container */}
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/50 overflow-hidden backdrop-blur-sm">
          {/* Header */}
          <div className="h-20 px-8 flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
              </div>
              <div>
                <div className="text-lg font-semibold text-slate-900">AI Travel Specialist</div>
                <div className="text-sm text-green-600 font-medium">Online • Ready to plan</div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowPlan(!showPlan)}
                className={`px-6 py-3 text-sm font-medium rounded-2xl transition-all duration-200 ${
                  showPlan 
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25' 
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                }`}
              >
                {showPlan ? 'Hide Itinerary' : 'Show Itinerary'}
              </button>
            </div>
          </div>

          {/* Chat Messages Area */}
          <div className="h-[500px] overflow-y-auto p-8 space-y-6 bg-gradient-to-b from-white to-slate-50/30">
            {messages.map((message, index) => (
              <div key={message.id} className="space-y-4">
                {/* Message Bubble */}
                <div className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div 
                    className={`max-w-2xl px-7 py-5 rounded-3xl text-base leading-relaxed shadow-sm ${
                      message.sender === 'user'
                        ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-br-lg shadow-lg shadow-blue-500/20'
                        : 'bg-white text-slate-800 border border-slate-200 rounded-bl-lg shadow-lg shadow-slate-500/10'
                    }`}
                  >
                    {message.text}
                  </div>
                </div>
                
                {/* Quick Replies */}
                {message.quickReplies && message.sender === 'bot' && index === messages.length - 1 && (
                  <div className="flex flex-wrap gap-3 ml-0 mt-4">
                    {message.quickReplies.map((reply, i) => (
                      <button
                        key={i}
                        onClick={() => handleQuickReply(reply)}
                        className="px-5 py-3 text-sm font-medium bg-white border border-slate-300 rounded-2xl hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 text-slate-700 transition-all duration-200 shadow-sm"
                      >
                        {reply}
                      </button>
                    ))}
                  </div>
                )}
                
                {/* Spacing between speaker groups */}
                {index < messages.length - 1 && messages[index + 1].sender !== message.sender && (
                  <div className="h-6" />
                )}
              </div>
            ))}
            
            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 rounded-3xl rounded-bl-lg px-7 py-5 shadow-lg shadow-slate-500/10">
                  <div className="flex space-x-2">
                    <div className="w-2.5 h-2.5 bg-slate-400 rounded-full animate-bounce"></div>
                    <div className="w-2.5 h-2.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2.5 h-2.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Composer */}
          <div className="p-8 border-t border-slate-200 bg-gradient-to-r from-slate-50 to-white">
            <div className="flex items-center space-x-5">
              <button className="text-slate-400 hover:text-slate-600 transition-colors p-3 hover:bg-slate-100 rounded-2xl">
                <Paperclip className="w-6 h-6" />
              </button>
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Describe your ideal trip..."
                  className="w-full bg-white border border-slate-300 rounded-2xl px-7 py-5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base shadow-sm transition-all duration-200"
                />
              </div>
              <button
                onClick={handleSendMessage}
                disabled={!currentMessage.trim()}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-5 rounded-2xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-blue-500/25"
              >
                <Send className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Plan Section - Below Chat */}
        <AnimatePresence>
          {showPlan && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="mt-8 bg-white rounded-3xl shadow-2xl border border-slate-200/50 overflow-hidden backdrop-blur-sm"
            >
              {/* Plan Header */}
              <div className="px-8 py-6 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900">Your Curated Itinerary</h2>
                      <p className="text-sm text-slate-600 font-medium">Personalized recommendations • Last updated {formatTime(planData.lastUpdated)}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-slate-600">
                    <Shield className="w-4 h-4" />
                    <span>Price protected until booking</span>
                  </div>
                </div>
                
                {/* Summary Chips */}
                <div className="flex flex-wrap gap-4">
                  <div className="px-4 py-3 bg-blue-100 text-blue-800 rounded-2xl text-sm font-medium flex items-center shadow-sm">
                    <MapPin className="w-4 h-4 mr-2" />
                    {planData.destination}
                  </div>
                  <div className="px-4 py-3 bg-emerald-100 text-emerald-800 rounded-2xl text-sm font-medium flex items-center shadow-sm">
                    <Calendar className="w-4 h-4 mr-2" />
                    {planData.dates}
                  </div>
                  <div className="px-4 py-3 bg-purple-100 text-purple-800 rounded-2xl text-sm font-medium flex items-center shadow-sm">
                    <Users className="w-4 h-4 mr-2" />
                    {planData.travelers} travelers
                  </div>
                  <div className="px-4 py-3 bg-amber-100 text-amber-800 rounded-2xl text-sm font-medium flex items-center shadow-sm">
                    <DollarSign className="w-4 h-4 mr-2" />
                    Budget: {formatPrice(planData.budget.amount, planData.budget.currency)}
                  </div>
                </div>
              </div>
              
              {/* Plan Content */}
              <div className="p-8 space-y-10">
                {/* Accommodation Section */}
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center">
                    <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center mr-3">
                      <User className="w-4 h-4 text-blue-600" />
                    </div>
                    Accommodation Options
                  </h3>
                  <div className="grid gap-6 lg:grid-cols-2">
                    {planData.sections.accommodation.map((item) => (
                      <div key={item.id} className="border border-slate-200 rounded-2xl p-6 hover:shadow-lg transition-all duration-200 bg-gradient-to-br from-white to-slate-50/30">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h4 className="text-lg font-bold text-slate-900 mb-1">{item.name}</h4>
                            <p className="text-sm text-slate-600 mb-2">{item.description}</p>
                            <p className="text-sm text-slate-500">{item.details}</p>
                          </div>
                          <div className="text-right ml-6">
                            <div className="text-2xl font-bold text-slate-900">
                              {formatPrice(item.price.native.amount, item.price.native.currency)}
                            </div>
                            <div className="text-sm text-slate-500 space-x-2">
                              <span>{formatPrice(item.price.usd, 'USD')}</span>
                              <span>•</span>
                              <span>{formatPrice(item.price.gbp, 'GBP')}</span>
                            </div>
                            <div className="text-xs text-slate-400 mt-1">per night</div>
                          </div>
                        </div>
                        
                        {item.whyItFits && (
                          <div className="mb-5">
                            <p className="text-sm font-semibold text-slate-700 mb-3">Why this is perfect for you:</p>
                            <div className="space-y-2">
                              {item.whyItFits.map((reason, i) => (
                                <div key={i} className="flex items-start text-sm text-slate-600">
                                  <Check className="w-4 h-4 text-emerald-500 mr-2 mt-0.5 flex-shrink-0" />
                                  {reason}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <div className="flex space-x-3">
                          <button className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-5 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-semibold shadow-lg shadow-blue-500/25">
                            Select This Hotel
                          </button>
                          <button className="px-5 py-3 text-slate-600 border border-slate-300 rounded-xl hover:bg-slate-50 transition-all duration-200 font-medium">
                            Compare
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Transport Section */}
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center">
                    <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center mr-3">
                      <Calendar className="w-4 h-4 text-emerald-600" />
                    </div>
                    Transportation
                  </h3>
                  <div className="space-y-4">
                    {planData.sections.transport.map((item) => (
                      <div key={item.id} className="border border-slate-200 rounded-2xl p-6 bg-gradient-to-br from-white to-slate-50/30">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="text-lg font-bold text-slate-900 mb-1">{item.name}</h4>
                            <p className="text-sm text-slate-600">{item.description}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-slate-900">
                              {formatPrice(item.price.native.amount, item.price.native.currency)}
                            </div>
                            <div className="text-sm text-slate-500">{item.details}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Activities Section */}
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center">
                    <div className="w-8 h-8 bg-purple-100 rounded-xl flex items-center justify-center mr-3">
                      <Star className="w-4 h-4 text-purple-600" />
                    </div>
                    Curated Experiences
                  </h3>
                  <div className="grid gap-4 lg:grid-cols-2">
                    {planData.sections.activities.map((item) => (
                      <div key={item.id} className="border border-slate-200 rounded-2xl p-6 hover:shadow-md transition-all duration-200 bg-gradient-to-br from-white to-slate-50/30">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="text-lg font-bold text-slate-900 mb-1">{item.name}</h4>
                            <p className="text-sm text-slate-600">{item.description}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-slate-900">
                              {formatPrice(item.price.native.amount, item.price.native.currency)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Food Section */}
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center">
                    <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center mr-3">
                      <Users className="w-4 h-4 text-amber-600" />
                    </div>
                    Culinary Experiences
                  </h3>
                  <div className="space-y-4">
                    {planData.sections.food.map((item) => (
                      <div key={item.id} className="border border-slate-200 rounded-2xl p-6 bg-gradient-to-br from-white to-slate-50/30">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="text-lg font-bold text-slate-900 mb-1">{item.name}</h4>
                            <p className="text-sm text-slate-600">{item.description}</p>
                            <p className="text-sm text-slate-500 mt-1">{item.details}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-slate-900">
                              {formatPrice(item.price.native.amount, item.price.native.currency)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Trip Totals */}
                <div className="border-t border-slate-200 pt-8">
                  <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-3xl p-8 border border-slate-200">
                    <div className="flex justify-between items-center mb-6">
                      <div>
                        <h3 className="text-2xl font-bold text-slate-900 mb-2">Total Investment</h3>
                        <div className="flex items-center space-x-3 text-sm text-slate-600">
                          <div className="flex items-center space-x-1">
                            <Clock className="w-4 h-4" />
                            <span>Quoted {formatTime(planData.lastUpdated)}</span>
                          </div>
                          <span>•</span>
                          <div className="flex items-center space-x-1">
                            <Shield className="w-4 h-4" />
                            <span>All taxes included</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-4xl font-bold text-slate-900 mb-1">
                          {formatPrice(planData.totals.native.amount, planData.totals.native.currency)}
                        </div>
                        <div className="text-lg text-slate-600 space-x-3">
                          <span>{formatPrice(planData.totals.usd, 'USD')}</span>
                          <span>•</span>
                          <span>{formatPrice(planData.totals.gbp, 'GBP')}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-4">
                      <button
                        onClick={() => {
                          const summaryMessage: Message = {
                            id: Date.now().toString(),
                            text: "Perfect! I've finalized your Rome itinerary: Hotel Artemide accommodation + direct flights + Colosseum, Vatican & Pantheon tours + Trastevere food experience. Total: €1,680. Shall we proceed with booking?",
                            sender: 'bot',
                            timestamp: new Date(),
                            quickReplies: ['Book everything', 'Modify selections', 'Get alternatives', 'Add insurance']
                          }
                          setMessages(prev => [...prev, summaryMessage])
                        }}
                        className="flex-1 min-w-[200px] bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 px-8 rounded-2xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-bold text-lg shadow-lg shadow-blue-500/25"
                      >
                        Confirm Itinerary
                      </button>
                      <button className="px-8 py-4 text-slate-600 border border-slate-300 rounded-2xl hover:bg-slate-50 transition-all duration-200 font-semibold flex items-center">
                        <Download className="w-5 h-5 mr-2" />
                        Export PDF
                      </button>
                      <button className="px-8 py-4 text-slate-600 border border-slate-300 rounded-2xl hover:bg-slate-50 transition-all duration-200 font-semibold flex items-center">
                        <ExternalLink className="w-5 h-5 mr-2" />
                        Book Direct
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}