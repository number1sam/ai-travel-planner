'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  LayoutDashboard, 
  Users, 
  MapPin, 
  CreditCard, 
  BarChart3, 
  Settings, 
  Search,
  LogOut,
  Menu,
  X
} from 'lucide-react'

type AdminSection = 'dashboard' | 'users' | 'trips' | 'payments' | 'reports' | 'settings'

interface AdminLayoutProps {
  children: React.ReactNode
  activeSection: AdminSection
  onSectionChange: (section: AdminSection) => void
}

const sidebarItems = [
  { id: 'dashboard' as AdminSection, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'users' as AdminSection, label: 'Users', icon: Users },
  { id: 'trips' as AdminSection, label: 'Trips', icon: MapPin },
  { id: 'payments' as AdminSection, label: 'Payments', icon: CreditCard },
  { id: 'reports' as AdminSection, label: 'Reports', icon: BarChart3 },
  { id: 'settings' as AdminSection, label: 'Settings', icon: Settings },
]

export default function AdminLayout({ children, activeSection, onSectionChange }: AdminLayoutProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleSearch = async (query: string) => {
    if (!query.trim()) return

    // Search functionality - could search users, trips, etc.
    try {
      const response = await fetch(`/api/admin/search?q=${encodeURIComponent(query)}`)
      const results = await response.json()
      console.log('Search results:', results)
      // Handle search results - could open a search results modal
    } catch (error) {
      console.error('Search failed:', error)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' })
      localStorage.removeItem('token')
      window.location.href = '/'
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 bg-white rounded-lg shadow-lg"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar */}
      <motion.div
        initial={false}
        animate={{
          x: isMobileMenuOpen ? 0 : -250,
          opacity: isMobileMenuOpen ? 1 : 1
        }}
        className={`fixed lg:relative lg:translate-x-0 w-64 h-screen bg-gray-900 text-white z-40 lg:z-auto transition-transform duration-300 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        style={{ width: '250px' }}
      >
        {/* Logo */}
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-brand-green to-brand-seafoam rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-sm">AT</span>
            </div>
            <div>
              <h2 className="font-bold text-lg">Admin Panel</h2>
              <p className="text-gray-400 text-sm">Travel Planner</p>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-gray-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search users, trips, ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSearch(searchQuery)
                }
              }}
              className="w-full bg-gray-800 text-white placeholder-gray-400 pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green"
            />
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-2">
          {sidebarItems.map((item) => (
            <motion.button
              key={item.id}
              whileHover={{ x: 4, backgroundColor: 'rgba(14, 127, 118, 0.1)' }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                onSectionChange(item.id)
                setIsMobileMenuOpen(false)
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-200 ${
                activeSection === item.id
                  ? 'bg-gradient-to-r from-brand-green to-brand-seafoam text-white'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </motion.button>
          ))}
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-gray-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-red-600 rounded-lg transition-all duration-200"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </motion.div>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 lg:ml-0 flex flex-col min-h-screen">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="lg:hidden w-12"></div> {/* Spacer for mobile menu button */}
            <h1 className="text-2xl font-bold text-gray-900 capitalize">
              {activeSection === 'dashboard' ? 'Admin Dashboard' : activeSection}
            </h1>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                Last updated: {new Date().toLocaleTimeString()}
              </div>
              <div className="w-8 h-8 bg-gradient-to-r from-brand-green to-brand-seafoam rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">A</span>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}