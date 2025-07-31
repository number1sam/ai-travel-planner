'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Search, 
  Filter, 
  Edit, 
  MoreHorizontal, 
  User, 
  Mail, 
  Calendar, 
  CreditCard, 
  Shield,
  X,
  Save,
  RefreshCw,
  Ban,
  Key
} from 'lucide-react'

interface User {
  id: string
  name: string
  email: string
  subscriptionTier: 'Free' | 'Premium' | 'Pro'
  accountCreated: string
  status: 'Active' | 'Suspended' | 'Pending Verification'
  lastLogin: string
  totalTrips: number
  totalSpent: number
}

interface UserModalData extends User {
  phone?: string
  country?: string
  preferredCurrency: string
  healthMetrics: {
    syncedDevices: string[]
    lastSync: string
  }
  subscriptionDetails: {
    startDate: string
    nextBilling: string
    paymentMethod: string
  }
}

export default function UsersSection() {
  const [users, setUsers] = useState<User[]>([
    {
      id: '1',
      name: 'Sarah Johnson',
      email: 'sarah.johnson@email.com',
      subscriptionTier: 'Premium',
      accountCreated: '2024-01-15',
      status: 'Active',
      lastLogin: '2024-07-28',
      totalTrips: 5,
      totalSpent: 2450
    },
    {
      id: '2',
      name: 'Michael Chen',
      email: 'michael.chen@email.com',
      subscriptionTier: 'Pro',
      accountCreated: '2024-02-20',
      status: 'Active',
      lastLogin: '2024-07-27',
      totalTrips: 12,
      totalSpent: 8750
    },
    {
      id: '3',
      name: 'Emma Rodriguez',
      email: 'emma.rodriguez@email.com',
      subscriptionTier: 'Free',
      accountCreated: '2024-06-10',
      status: 'Pending Verification',
      lastLogin: '2024-07-25',
      totalTrips: 1,
      totalSpent: 0
    },
    {
      id: '4',
      name: 'David Thompson',
      email: 'david.thompson@email.com',
      subscriptionTier: 'Premium',
      accountCreated: '2024-03-05',
      status: 'Suspended',
      lastLogin: '2024-07-20',
      totalTrips: 3,
      totalSpent: 1200
    },
    {
      id: '5',
      name: 'Lisa Park',
      email: 'lisa.park@email.com',
      subscriptionTier: 'Pro',
      accountCreated: '2024-01-30',
      status: 'Active',
      lastLogin: '2024-07-28',
      totalTrips: 8,
      totalSpent: 4500
    }
  ])

  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterTier, setFilterTier] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedUser, setSelectedUser] = useState<UserModalData | null>(null)
  const [activeTab, setActiveTab] = useState<'profile' | 'subscription' | 'actions'>('profile')
  const [isLoading, setIsLoading] = useState(false)

  const itemsPerPage = 10
  const totalPages = Math.ceil(users.length / itemsPerPage)

  // Filter and search users
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.id.includes(searchQuery)
    
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus
    const matchesTier = filterTier === 'all' || user.subscriptionTier === filterTier

    return matchesSearch && matchesStatus && matchesTier
  })

  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800'
      case 'Suspended': return 'bg-red-100 text-red-800'
      case 'Pending Verification': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Free': return 'bg-gray-100 text-gray-800'
      case 'Premium': return 'bg-blue-100 text-blue-800'
      case 'Pro': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const handleEditUser = async (userId: string) => {
    setIsLoading(true)
    try {
      // Simulate API call to get detailed user data
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const user = users.find(u => u.id === userId)
      if (user) {
        const detailedUser: UserModalData = {
          ...user,
          phone: '+44 7123 456789',
          country: 'United Kingdom',
          preferredCurrency: 'GBP',
          healthMetrics: {
            syncedDevices: ['Apple Watch', 'Fitbit'],
            lastSync: '2024-07-28T10:30:00Z'
          },
          subscriptionDetails: {
            startDate: '2024-01-15',
            nextBilling: '2024-08-15',
            paymentMethod: '**** 1234'
          }
        }
        setSelectedUser(detailedUser)
      }
    } catch (error) {
      console.error('Failed to fetch user details:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateUser = async (userData: Partial<UserModalData>) => {
    if (!selectedUser) return

    setIsLoading(true)
    try {
      // Simulate API call
      const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      })

      if (response.ok) {
        // Update users list
        setUsers(prev => prev.map(user => 
          user.id === selectedUser.id 
            ? { ...user, ...userData }
            : user
        ))
        setSelectedUser(null)
      }
    } catch (error) {
      console.error('Failed to update user:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUserAction = async (action: 'reset_password' | 'suspend' | 'activate' | 'refund') => {
    if (!selectedUser) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })

      if (response.ok) {
        // Update user status if needed
        if (action === 'suspend') {
          setUsers(prev => prev.map(user => 
            user.id === selectedUser.id 
              ? { ...user, status: 'Suspended' as const }
              : user
          ))
        } else if (action === 'activate') {
          setUsers(prev => prev.map(user => 
            user.id === selectedUser.id 
              ? { ...user, status: 'Active' as const }
              : user
          ))
        }
        
        alert(`${action.replace('_', ' ')} completed successfully`)
      }
    } catch (error) {
      console.error(`Failed to ${action}:`, error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header and Filters */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        {/* Search and Filters Row */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-green"
          >
            <option value="all">All Status</option>
            <option value="Active">Active</option>
            <option value="Suspended">Suspended</option>
            <option value="Pending Verification">Pending Verification</option>
          </select>

          {/* Tier Filter */}
          <select
            value={filterTier}
            onChange={(e) => setFilterTier(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-green"
          >
            <option value="all">All Tiers</option>
            <option value="Free">Free</option>
            <option value="Premium">Premium</option>
            <option value="Pro">Pro</option>
          </select>
        </div>

        {/* Results Summary */}
        <div className="text-sm text-gray-600">
          Showing {paginatedUsers.length} of {filteredUsers.length} users
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subscription</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Activity</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedUsers.map((user, index) => (
                <motion.tr
                  key={user.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="hover:bg-gray-50 transition-colors duration-200"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-r from-brand-green to-brand-seafoam rounded-full flex items-center justify-center mr-4">
                        <span className="text-white font-medium text-sm">
                          {user.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTierColor(user.subscriptionTier)}`}>
                      {user.subscriptionTier}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(user.accountCreated).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(user.status)}`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div>{user.totalTrips} trips</div>
                      <div className="text-xs text-gray-500">£{user.totalSpent.toLocaleString()} spent</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleEditUser(user.id)}
                      className="text-brand-green hover:text-brand-seafoam transition-colors duration-200 flex items-center gap-1"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* User Management Modal */}
      <AnimatePresence>
        {selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedUser(null)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="w-6 h-6 text-gray-500" />
                  </button>
                </div>
                
                {/* User Info */}
                <div className="flex items-center gap-4 mt-4">
                  <div className="w-16 h-16 bg-gradient-to-r from-brand-green to-brand-seafoam rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-lg">
                      {selectedUser.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">{selectedUser.name}</h3>
                    <p className="text-gray-600">{selectedUser.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getTierColor(selectedUser.subscriptionTier)}`}>
                        {selectedUser.subscriptionTier}
                      </span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedUser.status)}`}>
                        {selectedUser.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-4 mt-6">
                  {[
                    { id: 'profile', label: 'Profile Details', icon: User },
                    { id: 'subscription', label: 'Subscription Info', icon: CreditCard },
                    { id: 'actions', label: 'Account Actions', icon: Shield }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                        activeTab === tab.id
                          ? 'bg-brand-green text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <tab.icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 max-h-96 overflow-y-auto">
                {activeTab === 'profile' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                        <input
                          type="text"
                          defaultValue={selectedUser.name}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                          type="email"
                          defaultValue={selectedUser.email}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                        <input
                          type="tel"
                          defaultValue={selectedUser.phone}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                        <input
                          type="text"
                          defaultValue={selectedUser.country}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Health Metrics</h4>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm text-gray-600">Synced Devices: {selectedUser.healthMetrics.syncedDevices.join(', ')}</p>
                        <p className="text-sm text-gray-600">Last Sync: {new Date(selectedUser.healthMetrics.lastSync).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'subscription' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Current Plan</label>
                        <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green">
                          <option value="Free" selected={selectedUser.subscriptionTier === 'Free'}>Free</option>
                          <option value="Premium" selected={selectedUser.subscriptionTier === 'Premium'}>Premium</option>
                          <option value="Pro" selected={selectedUser.subscriptionTier === 'Pro'}>Pro</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                        <input
                          type="text"
                          value={new Date(selectedUser.subscriptionDetails.startDate).toLocaleDateString()}
                          readOnly
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                        />
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-2">Billing Information</h4>
                      <p className="text-sm text-blue-800">Next Billing: {new Date(selectedUser.subscriptionDetails.nextBilling).toLocaleDateString()}</p>
                      <p className="text-sm text-blue-800">Payment Method: {selectedUser.subscriptionDetails.paymentMethod}</p>
                      <p className="text-sm text-blue-800">Total Spent: £{selectedUser.totalSpent.toLocaleString()}</p>
                    </div>
                  </div>
                )}

                {activeTab === 'actions' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => handleUserAction('reset_password')}
                        disabled={isLoading}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                      >
                        <Key className="w-4 h-4" />
                        Reset Password
                      </button>
                      
                      <button
                        onClick={() => handleUserAction(selectedUser.status === 'Active' ? 'suspend' : 'activate')}
                        disabled={isLoading}
                        className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-colors disabled:opacity-50 ${
                          selectedUser.status === 'Active'
                            ? 'bg-red-600 text-white hover:bg-red-700'
                            : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                      >
                        <Ban className="w-4 h-4" />
                        {selectedUser.status === 'Active' ? 'Suspend Account' : 'Activate Account'}
                      </button>
                    </div>
                    
                    <button
                      onClick={() => handleUserAction('refund')}
                      disabled={isLoading}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Issue Refund
                    </button>
                    
                    <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                      <h4 className="font-medium text-red-900 mb-2">Danger Zone</h4>
                      <p className="text-sm text-red-700 mb-3">
                        These actions cannot be undone. Please be certain before proceeding.
                      </p>
                      <button
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this user account? This action cannot be undone.')) {
                            // Handle account deletion
                          }
                        }}
                      >
                        Delete Account
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={() => setSelectedUser(null)}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleUpdateUser({})}
                  disabled={isLoading}
                  className="px-6 py-2 bg-gradient-to-r from-brand-green to-brand-seafoam text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save Changes
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}