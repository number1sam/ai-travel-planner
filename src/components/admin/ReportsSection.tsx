'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { Download, Calendar, Filter, TrendingUp } from 'lucide-react'

const revenueData = [
  { month: 'Jan', revenue: 12500, users: 850 },
  { month: 'Feb', revenue: 15200, users: 920 },
  { month: 'Mar', revenue: 18400, users: 1100 },
  { month: 'Apr', revenue: 22100, users: 1350 },
  { month: 'May', revenue: 26800, users: 1580 },
  { month: 'Jun', revenue: 31200, users: 1820 },
  { month: 'Jul', revenue: 28900, users: 1650 }
]

const destinationData = [
  { name: 'Europe', value: 35, color: '#0E7F76' },
  { name: 'Asia', value: 28, color: '#A3C6AD' },
  { name: 'North America', value: 20, color: '#2DD4BF' },
  { name: 'South America', value: 10, color: '#67E8F9' },
  { name: 'Africa', value: 7, color: '#A7F3D0' }
]

const subscriptionData = [
  { month: 'Jan', free: 450, premium: 300, pro: 100 },
  { month: 'Feb', free: 420, premium: 350, pro: 150 },
  { month: 'Mar', free: 400, premium: 450, pro: 250 },
  { month: 'Apr', free: 380, premium: 600, pro: 370 },
  { month: 'May', free: 350, premium: 780, pro: 450 },
  { month: 'Jun', free: 320, premium: 950, pro: 550 },
  { month: 'Jul', free: 300, premium: 850, pro: 500 }
]

export default function ReportsSection() {
  const [dateRange, setDateRange] = useState('7d')
  const [reportType, setReportType] = useState('revenue')

  const exportData = (format: 'csv' | 'pdf') => {
    // Simulate export functionality
    const data = reportType === 'revenue' ? revenueData : subscriptionData
    console.log(`Exporting ${reportType} data as ${format}:`, data)
    
    if (format === 'csv') {
      // CSV export logic
      const csv = data.map(row => Object.values(row).join(',')).join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${reportType}-report.csv`
      a.click()
    } else {
      // PDF export logic
      alert('PDF export would be implemented with a library like jsPDF')
    }
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Analytics & Reports</h2>
            <p className="text-gray-600">Advanced insights into platform performance</p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-green"
            >
              <option value="revenue">Revenue Report</option>
              <option value="users">User Growth</option>
              <option value="subscriptions">Subscriptions</option>
              <option value="destinations">Popular Destinations</option>
            </select>
            
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-green"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 3 months</option>
              <option value="1y">Last year</option>
            </select>
            
            <button
              onClick={() => exportData('csv')}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            
            <button
              onClick={() => exportData('pdf')}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-green to-brand-seafoam text-white rounded-xl hover:opacity-90 transition-opacity"
            >
              <Download className="w-4 h-4" />
              Export PDF
            </button>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Monthly Revenue Trend</h3>
            <div className="flex items-center text-green-600">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span className="text-sm font-medium">+15.3%</span>
            </div>
          </div>
          
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
                formatter={(value: any) => [`£${value.toLocaleString()}`, 'Revenue']}
              />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke="#0E7F76" 
                strokeWidth={3}
                dot={{ fill: '#0E7F76', strokeWidth: 2, r: 6 }}
                activeDot={{ r: 8, stroke: '#0E7F76', strokeWidth: 2, fill: '#fff' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        {/* User Growth */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-lg p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">User Growth</h3>
            <div className="flex items-center text-blue-600">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span className="text-sm font-medium">+12.5%</span>
            </div>
          </div>
          
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
                formatter={(value: any) => [value.toLocaleString(), 'Users']}
              />
              <Bar 
                dataKey="users" 
                fill="url(#userGradient)"
                radius={[4, 4, 0, 0]}
              />
              <defs>
                <linearGradient id="userGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" />
                  <stop offset="100%" stopColor="#1D4ED8" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Popular Destinations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl shadow-lg p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Popular Destinations</h3>
          
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={destinationData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                dataKey="value"
                startAngle={90}
                endAngle={450}
              >
                {destinationData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: any) => [`${value}%`, 'Share']} />
            </PieChart>
          </ResponsiveContainer>
          
          <div className="grid grid-cols-2 gap-2 mt-4">
            {destinationData.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-gray-600">{item.name}</span>
                <span className="text-sm font-medium text-gray-900 ml-auto">{item.value}%</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Subscription Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl shadow-lg p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Subscription Churn Rates</h3>
          
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={subscriptionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Bar dataKey="free" stackId="a" fill="#9CA3AF" radius={[0, 0, 0, 0]} />
              <Bar dataKey="premium" stackId="a" fill="#3B82F6" radius={[0, 0, 0, 0]} />
              <Bar dataKey="pro" stackId="a" fill="#7C3AED" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-400 rounded-full" />
              <span className="text-sm text-gray-600">Free</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full" />
              <span className="text-sm text-gray-600">Premium</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-600 rounded-full" />
              <span className="text-sm text-gray-600">Pro</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
          <div className="text-3xl font-bold text-green-600 mb-2">£89.2K</div>
          <div className="text-sm text-gray-600">Total Revenue</div>
          <div className="text-xs text-green-600 mt-1">+15.3% vs last month</div>
        </div>
        
        <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
          <div className="text-3xl font-bold text-blue-600 mb-2">12.8K</div>
          <div className="text-sm text-gray-600">Active Users</div>
          <div className="text-xs text-blue-600 mt-1">+12.5% vs last month</div>
        </div>
        
        <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
          <div className="text-3xl font-bold text-purple-600 mb-2">2.4%</div>
          <div className="text-sm text-gray-600">Churn Rate</div>
          <div className="text-xs text-green-600 mt-1">-0.3% vs last month</div>
        </div>
        
        <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
          <div className="text-3xl font-bold text-orange-600 mb-2">£6.95</div>
          <div className="text-sm text-gray-600">Avg Revenue Per User</div>
          <div className="text-xs text-orange-600 mt-1">+2.1% vs last month</div>
        </div>
      </div>
    </div>
  )
}