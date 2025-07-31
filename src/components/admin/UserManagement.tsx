'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Users, 
  Search, 
  Filter, 
  MoreVertical, 
  UserPlus, 
  UserMinus,
  Edit3,
  Eye,
  Ban,
  Check,
  X,
  Download,
  Upload,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CreditCard,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  Star,
  TrendingUp,
  Activity,
  Globe,
  Smartphone,
  Monitor,
  Settings,
  RefreshCw,
  SortAsc,
  SortDesc
} from 'lucide-react'

interface User {
  id: string
  name: string
  email: string
  phone?: string
  avatar?: string
  status: 'active' | 'inactive' | 'suspended' | 'pending'
  role: 'user' | 'premium' | 'admin' | 'moderator'
  registrationDate: string
  lastLogin: string
  totalBookings: number
  totalSpent: number
  location: {
    country: string
    city: string
    timezone: string
  }
  preferences: {
    newsletter: boolean
    notifications: boolean
    marketing: boolean
  }
  devices: Array<{
    type: 'mobile' | 'desktop' | 'tablet'
    os: string
    browser: string
    lastUsed: string
  }>
  subscription?: {
    type: 'basic' | 'premium' | 'enterprise'
    startDate: string
    endDate: string
    status: 'active' | 'cancelled' | 'expired'
  }
  verificationStatus: {
    email: boolean
    phone: boolean
    identity: boolean
  }
  riskScore: number
  tags: string[]
  notes?: string
}

interface UserManagementProps {
  users: User[]
  onUserUpdate: (userId: string, updates: Partial<User>) => void
  onUserDelete: (userId: string) => void
  onUserCreate: (user: Omit<User, 'id'>) => void
  onBulkAction: (action: string, userIds: string[]) => void
  onExportUsers: (format: 'csv' | 'excel') => void
}

export default function UserManagement({
  users,
  onUserUpdate,
  onUserDelete,
  onUserCreate,
  onBulkAction,
  onExportUsers
}: UserManagementProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'table' | 'list'>('table')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showUserModal, setShowUserModal] = useState(false)
  const [sortField, setSortField] = useState<keyof User>('registrationDate')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  // Filter states
  const [filters, setFilters] = useState({
    status: 'all',
    role: 'all',
    subscription: 'all',
    verificationStatus: 'all',
    riskLevel: 'all',
    registrationDateRange: { start: '', end: '' },
    lastLoginRange: { start: '', end: '' },
    spentRange: { min: '', max: '' },
    country: 'all'
  })

  // Filtered and sorted users
  const processedUsers = useMemo(() => {
    let filtered = users.filter(user => {
      // Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const searchMatch = 
          user.name.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query) ||
          user.phone?.toLowerCase().includes(query) ||
          user.location.country.toLowerCase().includes(query) ||
          user.location.city.toLowerCase().includes(query) ||
          user.tags.some(tag => tag.toLowerCase().includes(query))
        
        if (!searchMatch) return false
      }

      // Status filter
      if (filters.status !== 'all' && user.status !== filters.status) return false

      // Role filter
      if (filters.role !== 'all' && user.role !== filters.role) return false

      // Subscription filter
      if (filters.subscription !== 'all') {
        if (filters.subscription === 'none' && user.subscription) return false
        if (filters.subscription !== 'none' && (!user.subscription || user.subscription.type !== filters.subscription)) return false
      }

      // Verification status filter
      if (filters.verificationStatus !== 'all') {
        const isVerified = user.verificationStatus.email && user.verificationStatus.phone
        if (filters.verificationStatus === 'verified' && !isVerified) return false
        if (filters.verificationStatus === 'unverified' && isVerified) return false
      }

      // Risk level filter
      if (filters.riskLevel !== 'all') {
        if (filters.riskLevel === 'low' && user.riskScore > 30) return false
        if (filters.riskLevel === 'medium' && (user.riskScore <= 30 || user.riskScore > 70)) return false
        if (filters.riskLevel === 'high' && user.riskScore <= 70) return false
      }

      // Country filter
      if (filters.country !== 'all' && user.location.country !== filters.country) return false

      // Date range filters
      if (filters.registrationDateRange.start) {
        const regDate = new Date(user.registrationDate)
        const startDate = new Date(filters.registrationDateRange.start)
        if (regDate < startDate) return false
      }

      if (filters.registrationDateRange.end) {
        const regDate = new Date(user.registrationDate)
        const endDate = new Date(filters.registrationDateRange.end)
        if (regDate > endDate) return false
      }

      // Spent range filter
      if (filters.spentRange.min && user.totalSpent < parseFloat(filters.spentRange.min)) return false
      if (filters.spentRange.max && user.totalSpent > parseFloat(filters.spentRange.max)) return false

      return true
    })

    // Sort users
    filtered.sort((a, b) => {
      let aValue = a[sortField]
      let bValue = b[sortField]

      // Handle nested objects
      if (sortField === 'totalSpent' || sortField === 'totalBookings' || sortField === 'riskScore') {
        aValue = Number(aValue)
        bValue = Number(bValue)
      } else if (sortField === 'registrationDate' || sortField === 'lastLogin') {
        aValue = new Date(aValue as string).getTime()
        bValue = new Date(bValue as string).getTime()
      } else {
        aValue = String(aValue).toLowerCase()
        bValue = String(bValue).toLowerCase()
      }

      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
      }
    })

    return filtered
  }, [users, searchQuery, filters, sortField, sortDirection])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'inactive':
        return <Clock className="w-4 h-4 text-gray-500" />
      case 'suspended':
        return <Ban className="w-4 h-4 text-red-500" />
      case 'pending':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />
      default:
        return <Clock className="w-4 h-4 text-gray-500" />
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-700'
      case 'moderator':
        return 'bg-purple-100 text-purple-700'
      case 'premium':
        return 'bg-yellow-100 text-yellow-700'
      case 'user':
        return 'bg-blue-100 text-blue-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const getRiskColor = (score: number) => {
    if (score <= 30) return 'text-green-600 bg-green-100'
    if (score <= 70) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  const getRiskLabel = (score: number) => {
    if (score <= 30) return 'Low'
    if (score <= 70) return 'Medium'
    return 'High'
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const handleSort = (field: keyof User) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const selectAllUsers = () => {
    if (selectedUsers.length === processedUsers.length) {
      setSelectedUsers([])
    } else {
      setSelectedUsers(processedUsers.map(user => user.id))
    }
  }

  const clearFilters = () => {
    setFilters({
      status: 'all',
      role: 'all',
      subscription: 'all',
      verificationStatus: 'all',
      riskLevel: 'all',
      registrationDateRange: { start: '', end: '' },
      lastLoginRange: { start: '', end: '' },
      spentRange: { min: '', max: '' },
      country: 'all'
    })
    setSearchQuery('')
  }

  const uniqueCountries = Array.from(new Set(users.map(user => user.location.country))).sort()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-600 mt-1">
              {processedUsers.length} of {users.length} users {searchQuery || Object.values(filters).some(f => f !== 'all' && f !== '') ? '(filtered)' : ''}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* View Mode Selector */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              {[
                { mode: 'table', icon: <Monitor className="w-4 h-4" /> },
                { mode: 'grid', icon: <Users className="w-4 h-4" /> },
                { mode: 'list', icon: <Activity className="w-4 h-4" /> }
              ].map(({ mode, icon }) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode as any)}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === mode 
                      ? 'bg-white text-brand-green shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowUserModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-brand-green text-white rounded-lg hover:bg-opacity-90 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Add User
            </button>

            <div className="relative">
              <select
                onChange={(e) => onExportUsers(e.target.value as any)}
                className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green appearance-none cursor-pointer pr-10"
                defaultValue=""
              >
                <option value="" disabled>Export</option>
                <option value="csv">Export CSV</option>
                <option value="excel">Export Excel</option>
              </select>
              <Download className="w-4 h-4 absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-500" />
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search users by name, email, phone, location, or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green"
              />
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                showFilters || Object.values(filters).some(f => f !== 'all' && f !== '')
                  ? 'border-brand-green bg-brand-green bg-opacity-10 text-brand-green'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
              {Object.values(filters).some(f => f !== 'all' && f !== '') && (
                <span className="bg-brand-green text-white text-xs px-2 py-1 rounded-full">
                  {Object.values(filters).filter(f => f !== 'all' && f !== '').length}
                </span>
              )}
            </button>

            <button
              onClick={clearFilters}
              className="px-4 py-3 text-gray-600 hover:text-gray-900 transition-colors"
            >
              Clear
            </button>
          </div>

          {/* Advanced Filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    value={filters.role}
                    onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green"
                  >
                    <option value="all">All Roles</option>
                    <option value="user">User</option>
                    <option value="premium">Premium</option>
                    <option value="moderator">Moderator</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subscription</label>
                  <select
                    value={filters.subscription}
                    onChange={(e) => setFilters(prev => ({ ...prev, subscription: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green"
                  >
                    <option value="all">All Subscriptions</option>
                    <option value="none">No Subscription</option>
                    <option value="basic">Basic</option>
                    <option value="premium">Premium</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Verification</label>
                  <select
                    value={filters.verificationStatus}
                    onChange={(e) => setFilters(prev => ({ ...prev, verificationStatus: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green"
                  >
                    <option value="all">All Users</option>
                    <option value="verified">Verified</option>
                    <option value="unverified">Unverified</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Risk Level</label>
                  <select
                    value={filters.riskLevel}
                    onChange={(e) => setFilters(prev => ({ ...prev, riskLevel: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green"
                  >
                    <option value="all">All Risk Levels</option>
                    <option value="low">Low Risk (0-30)</option>
                    <option value="medium">Medium Risk (31-70)</option>
                    <option value="high">High Risk (71-100)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                  <select
                    value={filters.country}
                    onChange={(e) => setFilters(prev => ({ ...prev, country: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green"
                  >
                    <option value="all">All Countries</option>
                    {uniqueCountries.map(country => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Spent</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={filters.spentRange.min}
                    onChange={(e) => setFilters(prev => ({ 
                      ...prev, 
                      spentRange: { ...prev.spentRange, min: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Spent</label>
                  <input
                    type="number"
                    placeholder="10000"
                    value={filters.spentRange.max}
                    onChange={(e) => setFilters(prev => ({ 
                      ...prev, 
                      spentRange: { ...prev.spentRange, max: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bulk Actions */}
        {selectedUsers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg mt-4"
          >
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-blue-900">
                {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onBulkAction('activate', selectedUsers)}
                className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
              >
                Activate
              </button>
              <button
                onClick={() => onBulkAction('suspend', selectedUsers)}
                className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
              >
                Suspend
              </button>
              <button
                onClick={() => onBulkAction('delete', selectedUsers)}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Delete
              </button>
              <button
                onClick={() => setSelectedUsers([])}
                className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Users Table */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left">
                    <input
                      type="checkbox"
                      checked={selectedUsers.length === processedUsers.length && processedUsers.length > 0}
                      onChange={selectAllUsers}
                      className="rounded border-gray-300 text-brand-green focus:ring-brand-green"
                    />
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">
                    <button
                      onClick={() => handleSort('name')}
                      className="flex items-center gap-1 hover:text-brand-green transition-colors"
                    >
                      User
                      {sortField === 'name' && (
                        sortDirection === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">
                    <button
                      onClick={() => handleSort('status')}
                      className="flex items-center gap-1 hover:text-brand-green transition-colors"
                    >
                      Status
                      {sortField === 'status' && (
                        sortDirection === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">
                    <button
                      onClick={() => handleSort('role')}
                      className="flex items-center gap-1 hover:text-brand-green transition-colors"
                    >
                      Role
                      {sortField === 'role' && (
                        sortDirection === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">Location</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">
                    <button
                      onClick={() => handleSort('totalSpent')}
                      className="flex items-center gap-1 hover:text-brand-green transition-colors"
                    >
                      Total Spent
                      {sortField === 'totalSpent' && (
                        sortDirection === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">
                    <button
                      onClick={() => handleSort('riskScore')}
                      className="flex items-center gap-1 hover:text-brand-green transition-colors"
                    >
                      Risk
                      {sortField === 'riskScore' && (
                        sortDirection === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">
                    <button
                      onClick={() => handleSort('registrationDate')}
                      className="flex items-center gap-1 hover:text-brand-green transition-colors"
                    >
                      Joined
                      {sortField === 'registrationDate' && (
                        sortDirection === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {processedUsers.map((user, index) => (
                  <motion.tr
                    key={user.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id)}
                        onChange={() => toggleUserSelection(user.id)}
                        className="rounded border-gray-300 text-brand-green focus:ring-brand-green"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-brand-green to-brand-seafoam rounded-full flex items-center justify-center text-white font-bold">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-600">{user.email}</div>
                          {user.phone && (
                            <div className="text-xs text-gray-500">{user.phone}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(user.status)}
                        <span className="text-sm capitalize">{user.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 text-sm font-medium rounded-full ${getRoleColor(user.role)}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{user.location.city}</div>
                      <div className="text-xs text-gray-500">{user.location.country}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-gray-900">{formatCurrency(user.totalSpent)}</div>
                      <div className="text-xs text-gray-500">{user.totalBookings} bookings</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRiskColor(user.riskScore)}`}>
                        {getRiskLabel(user.riskScore)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{formatDate(user.registrationDate)}</div>
                      <div className="text-xs text-gray-500">Last: {formatDate(user.lastLogin)}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedUser(user)
                            setShowUserModal(true)
                          }}
                          className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedUser(user)
                            setShowUserModal(true)
                          }}
                          className="p-1 text-gray-400 hover:text-green-500 transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onUserDelete(user.id)}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {processedUsers.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
              <p className="text-gray-600">
                {searchQuery || Object.values(filters).some(f => f !== 'all' && f !== '')
                  ? 'Try adjusting your search or filters'
                  : 'No users have been created yet'
                }
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}