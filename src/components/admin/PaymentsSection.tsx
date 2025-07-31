'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Search, RefreshCw, DollarSign, CreditCard, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

interface Payment {
  id: string
  userId: string
  userName: string
  subscriptionPlan: string
  amount: number
  status: 'Success' | 'Failed' | 'Refunded'
  paymentMethod: 'stripe' | 'paypal'
  transactionId: string
  createdAt: string
}

export default function PaymentsSection() {
  const [payments, setPayments] = useState<Payment[]>([
    {
      id: 'PAY-001',
      userId: '1',
      userName: 'Sarah Johnson',
      subscriptionPlan: 'Premium',
      amount: 9.99,
      status: 'Success',
      paymentMethod: 'stripe',
      transactionId: 'pi_1234567890',
      createdAt: '2024-07-28T10:30:00Z'
    },
    {
      id: 'PAY-002',
      userId: '2',
      userName: 'Michael Chen',
      subscriptionPlan: 'Pro',
      amount: 19.99,
      status: 'Success',
      paymentMethod: 'paypal',
      transactionId: 'PAYID-12345',
      createdAt: '2024-07-27T15:45:00Z'
    },
    {
      id: 'PAY-003',
      userId: '3',
      userName: 'Emma Rodriguez',
      subscriptionPlan: 'Premium',
      amount: 9.99,
      status: 'Failed',
      paymentMethod: 'stripe',
      transactionId: 'pi_9876543210',
      createdAt: '2024-07-26T09:15:00Z'
    }
  ])

  const [searchQuery, setSearchQuery] = useState('')
  const [isProcessingRefund, setIsProcessingRefund] = useState<string | null>(null)

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Success': return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'Failed': return <XCircle className="w-4 h-4 text-red-600" />
      case 'Refunded': return <RefreshCw className="w-4 h-4 text-orange-600" />
      default: return <AlertCircle className="w-4 h-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Success': return 'bg-green-100 text-green-800'
      case 'Failed': return 'bg-red-100 text-red-800'
      case 'Refunded': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const handleRefund = async (paymentId: string) => {
    setIsProcessingRefund(paymentId)
    
    try {
      const response = await fetch('/api/admin/refunds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId })
      })

      if (response.ok) {
        setPayments(prev => prev.map(payment => 
          payment.id === paymentId 
            ? { ...payment, status: 'Refunded' as const }
            : payment
        ))
        alert('Refund processed successfully. User will be notified via email.')
      } else {
        alert('Failed to process refund. Please try again.')
      }
    } catch (error) {
      console.error('Refund error:', error)
      alert('Failed to process refund. Please try again.')
    } finally {
      setIsProcessingRefund(null)
    }
  }

  const filteredPayments = payments.filter(payment =>
    payment.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    payment.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    payment.transactionId.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalRevenue = payments
    .filter(p => p.status === 'Success')
    .reduce((sum, p) => sum + p.amount, 0)

  const successRate = payments.length > 0 
    ? (payments.filter(p => p.status === 'Success').length / payments.length * 100).toFixed(1)
    : '0'

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">£{totalRevenue.toFixed(2)}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Success Rate</p>
              <p className="text-2xl font-bold text-gray-900">{successRate}%</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Transactions</p>
              <p className="text-2xl font-bold text-gray-900">{payments.length}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Recent Transactions</h2>
          <div className="text-sm text-gray-500">
            {filteredPayments.length} transactions
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by payment ID, user name, or transaction ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-green"
          />
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Payment ID</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredPayments.map((payment, index) => (
                <motion.tr
                  key={payment.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="hover:bg-gray-50"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-mono text-sm text-gray-900">{payment.id}</div>
                    <div className="text-xs text-gray-500">{payment.transactionId}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-gradient-to-r from-brand-green to-brand-seafoam rounded-full flex items-center justify-center mr-3">
                        <span className="text-white text-xs font-medium">
                          {payment.userName.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{payment.userName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{payment.subscriptionPlan}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900">£{payment.amount}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {payment.paymentMethod === 'stripe' ? (
                        <div className="flex items-center">
                          <div className="w-6 h-4 bg-blue-600 rounded text-white text-xs flex items-center justify-center mr-2">S</div>
                          Stripe
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <div className="w-6 h-4 bg-blue-800 rounded text-white text-xs flex items-center justify-center mr-2">P</div>
                          PayPal
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getStatusIcon(payment.status)}
                      <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(payment.status)}`}>
                        {payment.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(payment.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {payment.status === 'Success' && (
                      <button
                        onClick={() => handleRefund(payment.id)}
                        disabled={isProcessingRefund === payment.id}
                        className="text-orange-600 hover:text-orange-800 text-sm font-medium disabled:opacity-50 flex items-center gap-1"
                      >
                        {isProcessingRefund === payment.id ? (
                          <>
                            <div className="w-3 h-3 border border-orange-600 border-t-transparent rounded-full animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-4 h-4" />
                            Refund
                          </>
                        )}
                      </button>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}