'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Users, MapPin, DollarSign, AlertCircle, TrendingUp, Calendar, User, CreditCard } from 'lucide-react'

interface SummaryCard {
  title: string
  value: string | number
  change: string
  changeType: 'positive' | 'negative' | 'neutral'
  icon: React.ComponentType<any>
  color: string
}

interface ActivityItem {
  id: string
  type: 'signup' | 'trip_completed' | 'itinerary_generated' | 'payment' | 'issue'
  message: string
  timestamp: Date
  user?: string
  amount?: number
}

export default function DashboardOverview() {
  const [summaryData, setSummaryData] = useState<SummaryCard[]>([
    {
      title: 'Total Active Users',
      value: 12847,
      change: '+12.5%',
      changeType: 'positive',
      icon: Users,
      color: 'from-blue-500 to-blue-600'
    },
    {
      title: 'Trips Planned This Month',
      value: 1284,
      change: '+8.2%',
      changeType: 'positive',
      icon: MapPin,
      color: 'from-green-500 to-green-600'
    },
    {
      title: 'Total Revenue',
      value: '£89,247',
      change: '+15.3%',
      changeType: 'positive',
      icon: DollarSign,
      color: 'from-purple-500 to-purple-600'
    },
    {
      title: 'Pending Issues',
      value: 23,
      change: '-5 from yesterday',
      changeType: 'positive',
      icon: AlertCircle,
      color: 'from-red-500 to-red-600'
    }
  ])

  const [activityFeed, setActivityFeed] = useState<ActivityItem[]>([
    {
      id: '1',
      type: 'signup',
      message: 'New user registration',
      timestamp: new Date(Date.now() - 5 * 60 * 1000),
      user: 'Sarah Johnson'
    },
    {
      id: '2',
      type: 'trip_completed',
      message: 'Trip completed: Tokyo Adventure',
      timestamp: new Date(Date.now() - 15 * 60 * 1000),
      user: 'Michael Chen'
    },
    {
      id: '3',
      type: 'payment',
      message: 'Premium subscription payment',
      timestamp: new Date(Date.now() - 25 * 60 * 1000),
      user: 'Emma Rodriguez',
      amount: 9.99
    },
    {
      id: '4',
      type: 'itinerary_generated',
      message: 'New itinerary: European Tour',
      timestamp: new Date(Date.now() - 45 * 60 * 1000),
      user: 'David Thompson'
    },
    {
      id: '5',
      type: 'issue',
      message: 'Payment failed - requires attention',
      timestamp: new Date(Date.now() - 65 * 60 * 1000),
      user: 'Lisa Park'
    }
  ])

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Randomly update summary data
      setSummaryData(prev => prev.map(card => {
        if (card.title === 'Total Active Users') {
          const newValue = typeof card.value === 'number' ? card.value + Math.floor(Math.random() * 3) : card.value
          return { ...card, value: newValue }
        }
        return card
      }))

      // Add new activity item occasionally
      if (Math.random() < 0.3) {
        const newActivity: ActivityItem = {
          id: Date.now().toString(),
          type: 'signup',
          message: 'New user registration',
          timestamp: new Date(),
          user: 'New User'
        }
        setActivityFeed(prev => [newActivity, ...prev.slice(0, 9)])
      }
    }, 10000)

    return () => clearInterval(interval)
  }, [])

  const getRelativeTime = (timestamp: Date) => {
    const now = new Date()
    const diff = now.getTime() - timestamp.getTime()
    const minutes = Math.floor(diff / 60000)
    
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    return timestamp.toLocaleDateString()
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'signup': return <User className="w-4 h-4 text-blue-600" />
      case 'trip_completed': return <MapPin className="w-4 h-4 text-green-600" />
      case 'payment': return <CreditCard className="w-4 h-4 text-purple-600" />
      case 'itinerary_generated': return <Calendar className="w-4 h-4 text-orange-600" />
      case 'issue': return <AlertCircle className="w-4 h-4 text-red-600" />
      default: return <User className="w-4 h-4 text-gray-600" />
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'signup': return 'bg-blue-50 border-blue-200'
      case 'trip_completed': return 'bg-green-50 border-green-200'
      case 'payment': return 'bg-purple-50 border-purple-200'
      case 'itinerary_generated': return 'bg-orange-50 border-orange-200'
      case 'issue': return 'bg-red-50 border-red-200'
      default: return 'bg-gray-50 border-gray-200'
    }
  }

  const handleActivityClick = (activity: ActivityItem) => {
    // Open detailed view based on activity type
    switch (activity.type) {
      case 'signup':
      case 'payment':
        // Navigate to user details
        console.log(`Opening user: ${activity.user}`)
        break
      case 'trip_completed':
      case 'itinerary_generated':
        // Navigate to trip details
        console.log(`Opening trip details for: ${activity.user}`)
        break
      case 'issue':
        // Open issue details
        console.log(`Opening issue for: ${activity.user}`)
        break
    }
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {summaryData.map((card, index) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${card.color} flex items-center justify-center`}>
                <card.icon className="w-6 h-6 text-white" />
              </div>
              <div className={`text-sm font-medium px-2 py-1 rounded-full ${
                card.changeType === 'positive' ? 'text-green-700 bg-green-100' :
                card.changeType === 'negative' ? 'text-red-700 bg-red-100' :
                'text-gray-700 bg-gray-100'
              }`}>
                {card.change}
              </div>
            </div>
            
            <h3 className="text-2xl font-bold text-gray-900 mb-1">
              {typeof card.value === 'number' ? card.value.toLocaleString() : card.value}
            </h3>
            <p className="text-gray-600 text-sm">{card.title}</p>
          </motion.div>
        ))}
      </div>

      {/* Real-time Activity Feed */}
      <div className="bg-white rounded-2xl shadow-lg">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Real-time Activity Feed</h2>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              Live updates
            </div>
          </div>
        </div>
        
        <div className="p-6">
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {activityFeed.map((activity, index) => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                onClick={() => handleActivityClick(activity)}
                className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer hover:shadow-md transition-all duration-200 ${getActivityColor(activity.type)}`}
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-white flex items-center justify-center">
                  {getActivityIcon(activity.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-gray-900">
                      {activity.message}
                    </p>
                    <span className="text-xs text-gray-500">
                      {getRelativeTime(activity.timestamp)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-gray-600">
                    {activity.user && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {activity.user}
                      </span>
                    )}
                    {activity.amount && (
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        £{activity.amount}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="text-gray-400">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}