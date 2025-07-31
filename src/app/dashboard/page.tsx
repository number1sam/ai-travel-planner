'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// 🧹 OLD DASHBOARD REPLACED
// This dashboard has been deprecated and replaced with the new homepage
// All users are now redirected to /home which contains the main planning interface

export default function DashboardRedirect() {
  const router = useRouter()

  useEffect(() => {
    // Check if user is authenticated before redirecting
    const userData = localStorage.getItem('user')
    if (userData) {
      console.log('Authenticated user accessing dashboard - redirecting to /home')
      router.push('/home')
    } else {
      console.log('Unauthenticated user - redirecting to landing page')
      router.push('/')
    }
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-[#0E7F76] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Redirecting to your travel planner...</p>
      </div>
    </div>
  )
}