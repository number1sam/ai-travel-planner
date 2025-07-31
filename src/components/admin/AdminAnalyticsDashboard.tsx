'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  DollarSign, 
  Globe, 
  Calendar,
  Activity,
  Eye,
  Mouse,
  UserPlus,
  UserMinus,
  Star,
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  Filter,
  RefreshCw,
  Settings,
  Zap,
  Target,
  PieChart,
  LineChart,
  Map,
  Smartphone,
  Monitor,
  Tablet
} from 'lucide-react'

interface AnalyticsData {
  userMetrics: {
    totalUsers: number
    activeUsers: number
    newUsers: number
    userGrowth: number
    churnRate: number
    averageSessionDuration: number
    devicesBreakdown: { device: string; percentage: number; count: number }[]
    topCountries: { country: string; users: number; flag: string }[]
  }
  revenueMetrics: {
    totalRevenue: number
    monthlyRevenue: number
    revenueGrowth: number
    averageBookingValue: number
    conversionRate: number
    refundRate: number
    topRevenueCountries: { country: string; revenue: number }[]
    revenueByCategory: { category: string; revenue: number; percentage: number }[]
  }
  bookingMetrics: {
    totalBookings: number
    completedTrips: number
    activeTrips: number
    cancelledBookings: number
    averageTripDuration: number
    popularDestinations: { destination: string; bookings: number; revenue: number }[]
    bookingsByMonth: { month: string; bookings: number; revenue: number }[]
    seasonalTrends: { season: string; bookings: number; growthRate: number }[]
  }
  performanceMetrics: {
    pageViews: number
    uniqueVisitors: number
    bounceRate: number
    averagePageLoadTime: number
    apiResponseTime: number
    uptime: number
    errorRate: number
    topPages: { page: string; views: number; avgTime: number }[]
  }
}

interface AdminAnalyticsDashboardProps {
  data: AnalyticsData
  dateRange: { start: string; end: string }
  onDateRangeChange: (range: { start: string; end: string }) => void
  onExportData: (format: 'csv' | 'pdf' | 'excel') => void
  onRefreshData: () => void
}

export default function AdminAnalyticsDashboard({
  data,
  dateRange,
  onDateRangeChange,
  onExportData,
  onRefreshData
}: AdminAnalyticsDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'revenue' | 'bookings' | 'performance'>('overview')
  const [selectedTimeframe, setSelectedTimeframe] = useState<'24h' | '7d' | '30d' | '90d' | '1y'>('30d')
  const [showFilters, setShowFilters] = useState(false)

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'users', label: 'Users', icon: <Users className="w-4 h-4" /> },
    { id: 'revenue', label: 'Revenue', icon: <DollarSign className="w-4 h-4" /> },
    { id: 'bookings', label: 'Bookings', icon: <Calendar className="w-4 h-4" /> },
    { id: 'performance', label: 'Performance', icon: <Activity className="w-4 h-4" /> }
  ]

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`
    }
    return num.toString()
  }

  const getDeviceIcon = (device: string) => {
    switch (device.toLowerCase()) {
      case 'mobile':
        return <Smartphone className="w-4 h-4" />
      case 'desktop':
        return <Monitor className="w-4 h-4" />
      case 'tablet':
        return <Tablet className="w-4 h-4" />
      default:
        return <Monitor className="w-4 h-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Comprehensive insights into your travel platform performance
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <select
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value as any)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green"
            >
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="1y">Last Year</option>
            </select>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="p-2 text-gray-500 hover:text-brand-green transition-colors rounded-lg hover:bg-gray-100"
            >
              <Filter className="w-5 h-5" />
            </button>
            
            <button
              onClick={onRefreshData}
              className="p-2 text-gray-500 hover:text-brand-green transition-colors rounded-lg hover:bg-gray-100"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            
            <div className="relative">
              <select
                onChange={(e) => onExportData(e.target.value as any)}
                className="px-4 py-2 bg-brand-green text-white rounded-lg hover:bg-opacity-90 transition-colors appearance-none cursor-pointer"
                defaultValue=""
              >
                <option value="" disabled>Export</option>
                <option value="csv">Export CSV</option>
                <option value="pdf">Export PDF</option>
                <option value="excel">Export Excel</option>
              </select>
              <Download className="w-4 h-4 absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-white" />
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-brand-green shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-lg p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div className={`text-sm font-medium ${data.userMetrics.userGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatPercentage(data.userMetrics.userGrowth)}
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{formatNumber(data.userMetrics.totalUsers)}</div>
                <div className="text-sm text-gray-600">Total Users</div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl shadow-lg p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-100 rounded-xl">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <div className={`text-sm font-medium ${data.revenueMetrics.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatPercentage(data.revenueMetrics.revenueGrowth)}
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{formatCurrency(data.revenueMetrics.totalRevenue)}</div>
                <div className="text-sm text-gray-600">Total Revenue</div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl shadow-lg p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-100 rounded-xl">
                  <Calendar className="w-6 h-6 text-purple-600" />
                </div>
                <div className="text-sm font-medium text-green-600">
                  {((data.bookingMetrics.completedTrips / data.bookingMetrics.totalBookings) * 100).toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{formatNumber(data.bookingMetrics.totalBookings)}</div>
                <div className="text-sm text-gray-600">Total Bookings</div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-2xl shadow-lg p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-orange-100 rounded-xl">
                  <Activity className="w-6 h-6 text-orange-600" />
                </div>
                <div className={`text-sm font-medium ${data.performanceMetrics.uptime >= 99 ? 'text-green-600' : 'text-red-600'}`}>
                  {data.performanceMetrics.uptime.toFixed(2)}%
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{formatNumber(data.performanceMetrics.pageViews)}</div>
                <div className="text-sm text-gray-600">Page Views</div>
              </div>
            </motion.div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Trend */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">Revenue Trend</h3>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <div className="w-3 h-3 bg-brand-green rounded-full"></div>
                  <span>Monthly Revenue</span>
                </div>
              </div>
              
              {/* Mock Chart */}
              <div className="h-64 relative">
                <div className="absolute inset-0 flex items-end justify-between gap-2">
                  {data.bookingMetrics.bookingsByMonth.map((month, index) => (
                    <motion.div
                      key={month.month}
                      initial={{ height: 0 }}
                      animate={{ height: `${(month.revenue / Math.max(...data.bookingMetrics.bookingsByMonth.map(m => m.revenue))) * 100}%` }}
                      transition={{ duration: 1, delay: index * 0.1 }}
                      className="flex-1 bg-gradient-to-t from-brand-green to-brand-seafoam rounded-t-lg min-h-4 relative group"
                    >
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {formatCurrency(month.revenue)}
                      </div>
                    </motion.div>
                  ))}
                </div>
                <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-500 mt-2">
                  {data.bookingMetrics.bookingsByMonth.map((month) => (
                    <span key={month.month} className="flex-1 text-center">{month.month}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Top Destinations */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">Popular Destinations</h3>
                <Map className="w-5 h-5 text-gray-400" />
              </div>
              
              <div className="space-y-4">
                {data.bookingMetrics.popularDestinations.slice(0, 5).map((destination, index) => (
                  <motion.div
                    key={destination.destination}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-brand-green to-brand-seafoam rounded-full flex items-center justify-center text-white font-bold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{destination.destination}</div>
                        <div className="text-sm text-gray-600">{destination.bookings} bookings</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-900">{formatCurrency(destination.revenue)}</div>
                      <div className="text-xs text-gray-500">revenue</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* User Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-green-100 rounded-xl">
                  <UserPlus className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{formatNumber(data.userMetrics.newUsers)}</div>
                  <div className="text-sm text-gray-600">New Users</div>
                </div>
              </div>
              <div className="text-sm text-green-600 font-medium">
                +{formatPercentage(data.userMetrics.userGrowth)} from last period
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Activity className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{formatNumber(data.userMetrics.activeUsers)}</div>
                  <div className="text-sm text-gray-600">Active Users</div>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                {((data.userMetrics.activeUsers / data.userMetrics.totalUsers) * 100).toFixed(1)}% of total users
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-red-100 rounded-xl">
                  <UserMinus className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{data.userMetrics.churnRate.toFixed(1)}%</div>
                  <div className="text-sm text-gray-600">Churn Rate</div>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                {Math.round(data.userMetrics.totalUsers * (data.userMetrics.churnRate / 100))} users churned
              </div>
            </div>
          </div>

          {/* Device & Location Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Device Breakdown */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Device Usage</h3>
              <div className="space-y-4">
                {data.userMetrics.devicesBreakdown.map((device, index) => (
                  <motion.div
                    key={device.device}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      {getDeviceIcon(device.device)}
                      <span className="font-medium text-gray-900 capitalize">{device.device}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${device.percentage}%` }}
                          transition={{ duration: 1, delay: index * 0.1 }}
                          className="bg-brand-green h-2 rounded-full"
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-600 min-w-12">{device.percentage}%</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Top Countries */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Top Countries</h3>
              <div className="space-y-4">
                {data.userMetrics.topCountries.map((country, index) => (
                  <motion.div
                    key={country.country}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{country.flag}</span>
                      <span className="font-medium text-gray-900">{country.country}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-900">{formatNumber(country.users)}</div>
                      <div className="text-xs text-gray-500">users</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Revenue Tab */}
      {activeTab === 'revenue' && (
        <div className="space-y-6">
          {/* Revenue Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <DollarSign className="w-6 h-6 text-green-600" />
                <div className="text-sm text-gray-600">Monthly Revenue</div>
              </div>
              <div className="text-2xl font-bold text-gray-900">{formatCurrency(data.revenueMetrics.monthlyRevenue)}</div>
              <div className={`text-sm font-medium ${data.revenueMetrics.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatPercentage(data.revenueMetrics.revenueGrowth)} vs last month
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <Target className="w-6 h-6 text-blue-600" />
                <div className="text-sm text-gray-600">Average Booking</div>
              </div>
              <div className="text-2xl font-bold text-gray-900">{formatCurrency(data.revenueMetrics.averageBookingValue)}</div>
              <div className="text-sm text-gray-600">per transaction</div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <Zap className="w-6 h-6 text-yellow-600" />
                <div className="text-sm text-gray-600">Conversion Rate</div>
              </div>
              <div className="text-2xl font-bold text-gray-900">{data.revenueMetrics.conversionRate.toFixed(1)}%</div>
              <div className="text-sm text-gray-600">visitors to customers</div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600" />
                <div className="text-sm text-gray-600">Refund Rate</div>
              </div>
              <div className="text-2xl font-bold text-gray-900">{data.revenueMetrics.refundRate.toFixed(1)}%</div>
              <div className="text-sm text-gray-600">of total bookings</div>
            </div>
          </div>

          {/* Revenue by Category */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Revenue by Category</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.revenueMetrics.revenueByCategory.map((category, index) => (
                <motion.div
                  key={category.category}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-900 capitalize">{category.category}</h4>
                    <span className="text-sm text-gray-600">{category.percentage.toFixed(1)}%</span>
                  </div>
                  <div className="text-xl font-bold text-brand-green">{formatCurrency(category.revenue)}</div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${category.percentage}%` }}
                      transition={{ duration: 1, delay: index * 0.1 }}
                      className="bg-brand-green h-2 rounded-full"
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Performance Tab */}
      {activeTab === 'performance' && (
        <div className="space-y-6">
          {/* Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <Eye className="w-6 h-6 text-blue-600" />
                <div className="text-sm text-gray-600">Page Views</div>
              </div>
              <div className="text-2xl font-bold text-gray-900">{formatNumber(data.performanceMetrics.pageViews)}</div>
              <div className="text-sm text-gray-600">this period</div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <Mouse className="w-6 h-6 text-purple-600" />
                <div className="text-sm text-gray-600">Bounce Rate</div>
              </div>
              <div className="text-2xl font-bold text-gray-900">{data.performanceMetrics.bounceRate.toFixed(1)}%</div>
              <div className={`text-sm font-medium ${data.performanceMetrics.bounceRate < 50 ? 'text-green-600' : 'text-red-600'}`}>
                {data.performanceMetrics.bounceRate < 50 ? 'Good' : 'Needs improvement'}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <Clock className="w-6 h-6 text-orange-600" />
                <div className="text-sm text-gray-600">Load Time</div>
              </div>
              <div className="text-2xl font-bold text-gray-900">{data.performanceMetrics.averagePageLoadTime.toFixed(1)}s</div>
              <div className={`text-sm font-medium ${data.performanceMetrics.averagePageLoadTime < 3 ? 'text-green-600' : 'text-red-600'}`}>
                {data.performanceMetrics.averagePageLoadTime < 3 ? 'Fast' : 'Slow'}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <div className="text-sm text-gray-600">Uptime</div>
              </div>
              <div className="text-2xl font-bold text-gray-900">{data.performanceMetrics.uptime.toFixed(2)}%</div>
              <div className={`text-sm font-medium ${data.performanceMetrics.uptime >= 99 ? 'text-green-600' : 'text-red-600'}`}>
                {data.performanceMetrics.uptime >= 99 ? 'Excellent' : 'Poor'}
              </div>
            </div>
          </div>

          {/* Top Pages */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Top Performing Pages</h3>
            <div className="space-y-4">
              {data.performanceMetrics.topPages.map((page, index) => (
                <motion.div
                  key={page.page}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">{page.page}</div>
                    <div className="text-sm text-gray-600">Average time: {page.avgTime.toFixed(1)}s</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-900">{formatNumber(page.views)}</div>
                    <div className="text-sm text-gray-600">views</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}