'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { LogOut, User, Settings } from 'lucide-react'
import PlanForm from '@/components/PlanForm'

// 🏡 NEW APP HUB - REPLACING THE OLD HOMEPAGE DESIGN
// This becomes the operational hub after authentication
// Embedded with the freshly extracted PlanForm component

interface UserData {
  email: string
  name?: string
  subscriptionTier?: string
}

export default function HomePage() {
  const [user, setUser] = useState<UserData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // 🔒 ROUTE PROTECTION - Only authenticated users can access
    const userData = localStorage.getItem('user')
    
    if (!userData) {
      // Redirect unauthenticated users to auth page
      router.push('/auth')
      return
    }

    try {
      const parsedUser = JSON.parse(userData)
      setUser(parsedUser)
    } catch (error) {
      console.error('Invalid user data:', error)
      localStorage.removeItem('user')
      router.push('/auth')
      return
    }
    
    setIsLoading(false)
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('user')
    router.push('/auth')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#0E7F76] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your travel planner...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect to auth
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo and Title */}
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-r from-[#0E7F76] to-[#A3C6AD] rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">AI</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">AI Travel Planner</h1>
                <p className="text-sm text-gray-600">Plan smarter, travel healthier</p>
              </div>
            </div>

            {/* User Menu */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-xl">
                <User className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-900">
                  {user.name || user.email}
                </span>
                {user.subscriptionTier && (
                  <span className="text-xs px-2 py-1 bg-[#0E7F76] text-white rounded-full">
                    {user.subscriptionTier}
                  </span>
                )}
              </div>
              
              <button
                onClick={() => router.push('/settings')}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <Settings className="w-5 h-5" />
              </button>
              
              <button
                onClick={handleLogout}
                className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user.name || user.email}!
          </h2>
          <p className="text-lg text-gray-600">
            Ready for your next adventure? Here's your travel dashboard.
          </p>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="grid md:grid-cols-2 gap-6 mb-8"
        >
          {/* Create New Trip */}
          <div className="bg-gradient-to-r from-[#0E7F76] to-[#A3C6AD] rounded-2xl p-8 text-white">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <span className="text-2xl">✈️</span>
              </div>
              <h3 className="text-2xl font-bold">Plan a New Trip</h3>
            </div>
            <p className="text-white/90 mb-6">
              Let our AI create the perfect itinerary tailored to your preferences, budget, and health needs.
            </p>
            <button
              onClick={() => router.push('/planner')}
              className="bg-white text-[#0E7F76] px-6 py-3 rounded-xl font-semibold hover:bg-gray-100 transition-colors"
            >
              Start Planning
            </button>
          </div>

          {/* Quick Stats */}
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Your Travel Stats</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Trips</span>
                <span className="text-2xl font-bold text-[#0E7F76]">0</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Countries Visited</span>
                <span className="text-2xl font-bold text-[#0E7F76]">0</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Miles Traveled</span>
                <span className="text-2xl font-bold text-[#0E7F76]">0</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* My Trips Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-gray-900">My Trips</h3>
            <button
              onClick={() => router.push('/planner')}
              className="bg-[#0E7F76] text-white px-4 py-2 rounded-xl hover:bg-[#0E7F76]/90 transition-colors"
            >
              + New Trip
            </button>
          </div>
          
          {/* Empty State */}
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">🧳</span>
            </div>
            <h4 className="text-xl font-semibold text-gray-900 mb-2">No trips yet</h4>
            <p className="text-gray-600 mb-6">
              Start planning your first adventure with our AI travel assistant!
            </p>
            <button
              onClick={() => router.push('/planner')}
              className="bg-gradient-to-r from-[#0E7F76] to-[#A3C6AD] text-white px-8 py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity"
            >
              Plan Your First Trip
            </button>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="bg-white/60 backdrop-blur-sm border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="text-center text-sm text-gray-600">
            <p>&copy; 2024 AI Travel Planner. Designed for smarter, healthier travel.</p>
            <div className="flex justify-center gap-6 mt-4">
              <a href="/privacy" className="hover:text-[#0E7F76] transition-colors">Privacy Policy</a>
              <a href="/terms" className="hover:text-[#0E7F76] transition-colors">Terms of Service</a>
              <a href="/help" className="hover:text-[#0E7F76] transition-colors">Help & Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}