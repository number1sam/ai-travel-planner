'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import AdminLayout from '@/components/admin/AdminLayout'
import DashboardOverview from '@/components/admin/DashboardOverview'
import UsersSection from '@/components/admin/UsersSection'
import TripsSection from '@/components/admin/TripsSection'
import PaymentsSection from '@/components/admin/PaymentsSection'
import ReportsSection from '@/components/admin/ReportsSection'
import SettingsSection from '@/components/admin/SettingsSection'

type AdminSection = 'dashboard' | 'users' | 'trips' | 'payments' | 'reports' | 'settings'

export default function AdminPage() {
  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard')
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)

  // Check admin authorization
  useEffect(() => {
    const checkAdminAuth = async () => {
      try {
        const token = localStorage.getItem('token')
        if (!token) {
          setIsAuthorized(false)
          return
        }

        const response = await fetch('/api/admin/auth/verify', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (response.ok) {
          const data = await response.json()
          setIsAuthorized(data.isAdmin)
        } else {
          setIsAuthorized(false)
        }
      } catch (error) {
        setIsAuthorized(false)
      }
    }

    checkAdminAuth()
  }, [])

  // Show loading state while checking authorization
  if (isAuthorized === null) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white">Verifying admin access...</p>
        </div>
      </div>
    )
  }

  // Show unauthorized message
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md mx-auto p-8"
        >
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 text-2xl">🔒</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-4">Access Denied</h1>
          <p className="text-gray-300 mb-6">
            You don't have permission to access the admin panel. Please contact your administrator.
          </p>
          <button
            onClick={() => window.location.href = '/home'}
            className="bg-gradient-to-r from-brand-green to-brand-seafoam text-white px-6 py-3 rounded-lg hover:opacity-90 transition-opacity"
          >
            Go to Home
          </button>
        </motion.div>
      </div>
    )
  }

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'dashboard':
        return <DashboardOverview />
      case 'users':
        return <UsersSection />
      case 'trips':
        return <TripsSection />
      case 'payments':
        return <PaymentsSection />
      case 'reports':
        return <ReportsSection />
      case 'settings':
        return <SettingsSection />
      default:
        return <DashboardOverview />
    }
  }

  return (
    <AdminLayout
      activeSection={activeSection}
      onSectionChange={setActiveSection}
    >
      <motion.div
        key={activeSection}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        className="h-full"
      >
        {renderActiveSection()}
      </motion.div>
    </AdminLayout>
  )
}