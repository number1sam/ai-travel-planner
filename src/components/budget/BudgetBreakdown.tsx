'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  DollarSign, 
  PieChart, 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Plus,
  Minus,
  Edit3,
  Filter,
  Download,
  Share2,
  Calculator,
  CreditCard,
  Wallet,
  Plane,
  Hotel,
  Utensils,
  Car,
  Camera,
  ShoppingBag,
  Coffee,
  MapPin,
  Calendar,
  Info
} from 'lucide-react'

interface BudgetItem {
  id: string
  category: 'flights' | 'accommodation' | 'food' | 'transport' | 'activities' | 'shopping' | 'miscellaneous'
  subcategory?: string
  name: string
  plannedAmount: number
  actualAmount?: number
  date: string
  currency: string
  status: 'planned' | 'booked' | 'paid' | 'cancelled'
  priority: 'essential' | 'important' | 'optional'
  notes?: string
  bookingReference?: string
  isRecurring?: boolean
  tags?: string[]
}

interface BudgetBreakdownProps {
  budgetItems: BudgetItem[]
  totalBudget: number
  currency: string
  onItemUpdate: (itemId: string, updates: Partial<BudgetItem>) => void
  onItemAdd: (item: Omit<BudgetItem, 'id'>) => void
  onItemDelete: (itemId: string) => void
  exchangeRates?: Record<string, number>
}

export default function BudgetBreakdown({
  budgetItems,
  totalBudget,
  currency,
  onItemUpdate,
  onItemAdd,
  onItemDelete,
  exchangeRates = {}
}: BudgetBreakdownProps) {
  const [viewMode, setViewMode] = useState<'category' | 'timeline' | 'priority'>('category')
  const [showAddItem, setShowAddItem] = useState(false)
  const [editingItem, setEditingItem] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [showOnlyEssential, setShowOnlyEssential] = useState(false)

  const categoryIcons = {
    flights: <Plane className="w-5 h-5" />,
    accommodation: <Hotel className="w-5 h-5" />,
    food: <Utensils className="w-5 h-5" />,
    transport: <Car className="w-5 h-5" />,
    activities: <Camera className="w-5 h-5" />,
    shopping: <ShoppingBag className="w-5 h-5" />,
    miscellaneous: <Coffee className="w-5 h-5" />
  }

  const categoryColors = {
    flights: 'bg-blue-500',
    accommodation: 'bg-purple-500',
    food: 'bg-orange-500',
    transport: 'bg-green-500',
    activities: 'bg-pink-500',
    shopping: 'bg-yellow-500',
    miscellaneous: 'bg-gray-500'
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'essential':
        return 'text-red-600 bg-red-100'
      case 'important':
        return 'text-yellow-600 bg-yellow-100'
      case 'optional':
        return 'text-green-600 bg-green-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'planned':
        return <Calendar className="w-4 h-4 text-gray-500" />
      case 'booked':
        return <CheckCircle className="w-4 h-4 text-blue-500" />
      case 'paid':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'cancelled':
        return <AlertTriangle className="w-4 h-4 text-red-500" />
      default:
        return <Info className="w-4 h-4 text-gray-500" />
    }
  }

  // Calculate totals and statistics
  const totals = useMemo(() => {
    const planned = budgetItems.reduce((sum, item) => sum + item.plannedAmount, 0)
    const actual = budgetItems.reduce((sum, item) => sum + (item.actualAmount || 0), 0)
    const remaining = totalBudget - planned
    const variance = actual - planned

    return { planned, actual, remaining, variance }
  }, [budgetItems, totalBudget])

  // Group by category
  const categoryBreakdown = useMemo(() => {
    const categories = budgetItems.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = {
          name: item.category,
          planned: 0,
          actual: 0,
          items: [],
          percentage: 0
        }
      }
      
      acc[item.category].planned += item.plannedAmount
      acc[item.category].actual += item.actualAmount || 0
      acc[item.category].items.push(item)
      
      return acc
    }, {} as Record<string, any>)

    // Calculate percentages
    Object.values(categories).forEach((category: any) => {
      category.percentage = totals.planned > 0 ? (category.planned / totals.planned) * 100 : 0
    })

    return categories
  }, [budgetItems, totals.planned])

  const filteredItems = budgetItems.filter(item => {
    if (showOnlyEssential && item.priority !== 'essential') return false
    if (selectedCategory && item.category !== selectedCategory) return false
    return true
  })

  const formatCurrency = (amount: number, targetCurrency?: string) => {
    const curr = targetCurrency || currency
    const rate = exchangeRates[curr] || 1
    const convertedAmount = amount * rate
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: curr,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(convertedAmount)
  }

  return (
    <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-green to-brand-seafoam p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold">Budget Breakdown</h2>
            <p className="text-sm opacity-90">Track and manage your trip expenses</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{formatCurrency(totals.planned)}</div>
            <div className="text-sm opacity-90">of {formatCurrency(totalBudget)} planned</div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white bg-opacity-20 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="w-4 h-4" />
              <span className="text-xs opacity-75">Remaining</span>
            </div>
            <div className="font-bold">{formatCurrency(totals.remaining)}</div>
          </div>
          
          <div className="bg-white bg-opacity-20 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <CreditCard className="w-4 h-4" />
              <span className="text-xs opacity-75">Spent</span>
            </div>
            <div className="font-bold">{formatCurrency(totals.actual)}</div>
          </div>
          
          <div className="bg-white bg-opacity-20 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              {totals.variance >= 0 ? 
                <TrendingUp className="w-4 h-4" /> : 
                <TrendingDown className="w-4 h-4" />
              }
              <span className="text-xs opacity-75">Variance</span>
            </div>
            <div className={`font-bold ${totals.variance >= 0 ? 'text-red-200' : 'text-green-200'}`}>
              {totals.variance >= 0 ? '+' : ''}{formatCurrency(totals.variance)}
            </div>
          </div>
          
          <div className="bg-white bg-opacity-20 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Calculator className="w-4 h-4" />
              <span className="text-xs opacity-75">Categories</span>
            </div>
            <div className="font-bold">{Object.keys(categoryBreakdown).length}</div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* View Mode Selector */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              {[
                { mode: 'category', icon: <PieChart className="w-4 h-4" />, label: 'Category' },
                { mode: 'timeline', icon: <BarChart3 className="w-4 h-4" />, label: 'Timeline' },
                { mode: 'priority', icon: <AlertTriangle className="w-4 h-4" />, label: 'Priority' }
              ].map(({ mode, icon, label }) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode as any)}
                  className={`flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
                    viewMode === mode 
                      ? 'bg-white text-brand-green shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowOnlyEssential(!showOnlyEssential)}
                className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                  showOnlyEssential 
                    ? 'bg-red-100 text-red-700' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Filter className="w-4 h-4 inline mr-1" />
                Essential Only
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddItem(true)}
              className="flex items-center gap-2 px-4 py-2 bg-brand-green text-white text-sm rounded-lg hover:bg-opacity-90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Expense
            </button>
            <button className="p-2 text-gray-500 hover:text-brand-green transition-colors">
              <Download className="w-4 h-4" />
            </button>
            <button className="p-2 text-gray-500 hover:text-brand-green transition-colors">
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {viewMode === 'category' && (
          <div className="space-y-6">
            {/* Category Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(categoryBreakdown).map(([categoryKey, category]: [string, any]) => (
                <motion.div
                  key={categoryKey}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.02 }}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                    selectedCategory === categoryKey 
                      ? 'border-brand-green bg-brand-green bg-opacity-5' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedCategory(selectedCategory === categoryKey ? null : categoryKey)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg text-white ${categoryColors[categoryKey as keyof typeof categoryColors]}`}>
                        {categoryIcons[categoryKey as keyof typeof categoryIcons]}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 capitalize">{category.name}</h3>
                        <p className="text-xs text-gray-500">{category.items.length} items</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-900">{formatCurrency(category.planned)}</div>
                      <div className="text-xs text-gray-500">{category.percentage.toFixed(1)}%</div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-500 ${categoryColors[categoryKey as keyof typeof categoryColors]}`}
                      style={{ width: `${Math.min((category.actual / category.planned) * 100, 100)}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Spent: {formatCurrency(category.actual)}</span>
                    <span>{category.actual > category.planned ? 'Over budget' : 'On track'}</span>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Detailed Items */}
            {selectedCategory && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-50 rounded-2xl p-6"
              >
                <h3 className="text-lg font-bold text-gray-900 mb-4 capitalize">
                  {selectedCategory} Expenses
                </h3>
                <div className="space-y-3">
                  {categoryBreakdown[selectedCategory].items.map((item: BudgetItem, index: number) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold text-gray-900">{item.name}</h4>
                            {getStatusIcon(item.status)}
                            <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(item.priority)}`}>
                              {item.priority}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span>Planned: {formatCurrency(item.plannedAmount)}</span>
                            {item.actualAmount && (
                              <span className={item.actualAmount > item.plannedAmount ? 'text-red-600' : 'text-green-600'}>
                                Actual: {formatCurrency(item.actualAmount)}
                              </span>
                            )}
                            <span>{new Date(item.date).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditingItem(item.id)}
                            className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onItemDelete(item.id)}
                            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      {item.notes && (
                        <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-2 rounded">{item.notes}</p>
                      )}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        )}

        {viewMode === 'timeline' && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Expenses by Date</h3>
            {filteredItems
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
              .map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="text-sm text-gray-500 min-w-20">
                    {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                  <div className={`p-2 rounded-lg text-white ${categoryColors[item.category]}`}>
                    {categoryIcons[item.category]}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{item.name}</h4>
                    <p className="text-sm text-gray-600 capitalize">{item.category}</p>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-900">{formatCurrency(item.plannedAmount)}</div>
                    {item.actualAmount && (
                      <div className={`text-sm ${item.actualAmount > item.plannedAmount ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(item.actualAmount)}
                      </div>
                    )}
                  </div>
                  {getStatusIcon(item.status)}
                </motion.div>
              ))}
          </div>
        )}

        {viewMode === 'priority' && (
          <div className="space-y-6">
            {['essential', 'important', 'optional'].map((priority) => {
              const priorityItems = filteredItems.filter(item => item.priority === priority)
              const priorityTotal = priorityItems.reduce((sum, item) => sum + item.plannedAmount, 0)
              
              if (priorityItems.length === 0) return null

              return (
                <div key={priority} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className={`text-lg font-bold capitalize ${
                      priority === 'essential' ? 'text-red-600' :
                      priority === 'important' ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {priority} Expenses
                    </h3>
                    <div className="text-sm text-gray-600">
                      {priorityItems.length} items • {formatCurrency(priorityTotal)}
                    </div>
                  </div>
                  
                  <div className="grid gap-3">
                    {priorityItems.map((item, index) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center gap-4 p-3 bg-white border rounded-lg hover:shadow-md transition-shadow"
                      >
                        <div className={`p-2 rounded-lg text-white ${categoryColors[item.category]}`}>
                          {categoryIcons[item.category]}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{item.name}</h4>
                          <p className="text-sm text-gray-600">{item.subcategory || item.category}</p>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-gray-900">{formatCurrency(item.plannedAmount)}</div>
                          <div className="text-xs text-gray-500">{new Date(item.date).toLocaleDateString()}</div>
                        </div>
                        {getStatusIcon(item.status)}
                      </motion.div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Budget Alert */}
        {totals.planned > totalBudget && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3"
          >
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <div>
              <h4 className="font-semibold text-red-900">Budget Exceeded</h4>
              <p className="text-sm text-red-700">
                You're {formatCurrency(totals.planned - totalBudget)} over your planned budget. 
                Consider adjusting your expenses or increasing your budget.
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}