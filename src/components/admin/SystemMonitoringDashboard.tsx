'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Activity, 
  Server, 
  Database, 
  Wifi, 
  HardDrive,
  Cpu,
  Memory,
  Globe,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Zap,
  Shield,
  RefreshCw,
  Settings,
  Download,
  Bell,
  Terminal,
  Code,
  Cloud,
  Lock,
  Eye,
  EyeOff,
  Filter,
  Search,
  Calendar,
  BarChart3,
  PieChart,
  LineChart,
  Monitor,
  Smartphone
} from 'lucide-react'

interface SystemMetrics {
  id: string
  name: string
  status: 'healthy' | 'warning' | 'critical' | 'offline'
  uptime: number
  responseTime: number
  cpuUsage: number
  memoryUsage: number
  diskUsage: number
  networkIn: number
  networkOut: number
  errorRate: number
  requestsPerMinute: number
  lastChecked: string
  region: string
  version: string
  dependencies: Array<{
    name: string
    status: 'connected' | 'disconnected' | 'degraded'
    responseTime: number
  }>
  alerts: Array<{
    id: string
    type: 'info' | 'warning' | 'error' | 'critical'
    message: string
    timestamp: string
    acknowledged: boolean
  }>
}

interface SecurityEvent {
  id: string
  type: 'authentication' | 'authorization' | 'data_breach' | 'suspicious_activity' | 'system_intrusion'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  source: string
  timestamp: string
  status: 'active' | 'investigating' | 'resolved' | 'false_positive'
  affectedUsers?: number
  mitigationSteps?: string[]
}

interface LogEntry {
  id: string
  timestamp: string
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal'
  service: string
  message: string
  metadata?: Record<string, any>
  userId?: string
  requestId?: string
  duration?: number
}

interface SystemMonitoringDashboardProps {
  systems: SystemMetrics[]
  securityEvents: SecurityEvent[]
  logs: LogEntry[]
  onSystemAction: (systemId: string, action: 'restart' | 'scale' | 'stop') => void
  onAcknowledgeAlert: (systemId: string, alertId: string) => void
  onSecurityEventUpdate: (eventId: string, status: SecurityEvent['status']) => void
  onExportLogs: (format: 'json' | 'csv', filters: any) => void
}

export default function SystemMonitoringDashboard({
  systems,
  securityEvents,
  logs,
  onSystemAction,
  onAcknowledgeAlert,
  onSecurityEventUpdate,
  onExportLogs
}: SystemMonitoringDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'security' | 'logs'>('overview')
  const [selectedTimeframe, setSelectedTimeframe] = useState<'1h' | '6h' | '24h' | '7d' | '30d'>('24h')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSystem, setSelectedSystem] = useState<string | null>(null)
  
  // Log filters
  const [logFilters, setLogFilters] = useState({
    level: 'all',
    service: 'all',
    timeRange: '1h'
  })

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      // In real implementation, this would trigger data refresh
      console.log('Refreshing system metrics...')
    }, 30000) // Refresh every 30 seconds

    return () => clearInterval(interval)
  }, [autoRefresh])

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <Monitor className="w-4 h-4" /> },
    { id: 'performance', label: 'Performance', icon: <Activity className="w-4 h-4" /> },
    { id: 'security', label: 'Security', icon: <Shield className="w-4 h-4" /> },
    { id: 'logs', label: 'Logs', icon: <Terminal className="w-4 h-4" /> }
  ]

  // System health summary
  const systemSummary = useMemo(() => {
    const total = systems.length
    const healthy = systems.filter(s => s.status === 'healthy').length
    const warning = systems.filter(s => s.status === 'warning').length
    const critical = systems.filter(s => s.status === 'critical').length
    const offline = systems.filter(s => s.status === 'offline').length
    
    const avgUptime = systems.reduce((sum, s) => sum + s.uptime, 0) / total
    const avgResponseTime = systems.reduce((sum, s) => sum + s.responseTime, 0) / total
    const totalRequests = systems.reduce((sum, s) => sum + s.requestsPerMinute, 0)
    const avgErrorRate = systems.reduce((sum, s) => sum + s.errorRate, 0) / total

    return {
      total,
      healthy,
      warning,
      critical,
      offline,
      avgUptime,
      avgResponseTime,
      totalRequests,
      avgErrorRate
    }
  }, [systems])

  // Security summary
  const securitySummary = useMemo(() => {
    const activeEvents = securityEvents.filter(e => e.status === 'active').length
    const criticalEvents = securityEvents.filter(e => e.severity === 'critical').length
    const highEvents = securityEvents.filter(e => e.severity === 'high').length
    
    return {
      activeEvents,
      criticalEvents,
      highEvents,
      totalEvents: securityEvents.length
    }
  }, [securityEvents])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-100'
      case 'warning':
        return 'text-yellow-600 bg-yellow-100'
      case 'critical':
        return 'text-red-600 bg-red-100'
      case 'offline':
        return 'text-gray-600 bg-gray-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />
      case 'critical':
      case 'offline':
        return <XCircle className="w-4 h-4 text-red-500" />
      default:
        return <Clock className="w-4 h-4 text-gray-500" />
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low':
        return 'text-blue-600 bg-blue-100'
      case 'medium':
        return 'text-yellow-600 bg-yellow-100'
      case 'high':
        return 'text-orange-600 bg-orange-100'
      case 'critical':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'debug':
        return 'text-gray-600 bg-gray-100'
      case 'info':
        return 'text-blue-600 bg-blue-100'
      case 'warn':
        return 'text-yellow-600 bg-yellow-100'
      case 'error':
        return 'text-red-600 bg-red-100'
      case 'fatal':
        return 'text-purple-600 bg-purple-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const formatUptime = (uptime: number) => {
    const days = Math.floor(uptime / (24 * 60 * 60))
    const hours = Math.floor((uptime % (24 * 60 * 60)) / (60 * 60))
    const minutes = Math.floor((uptime % (60 * 60)) / 60)
    
    if (days > 0) return `${days}d ${hours}h`
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">System Monitoring</h1>
            <p className="text-gray-600 mt-1">
              Real-time system health and performance monitoring
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Auto-refresh:</span>
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  autoRefresh ? 'bg-brand-green' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    autoRefresh ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <select
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value as any)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green"
            >
              <option value="1h">Last Hour</option>
              <option value="6h">Last 6 Hours</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>

            <button
              onClick={() => window.location.reload()}
              className="p-2 text-gray-500 hover:text-brand-green transition-colors rounded-lg hover:bg-gray-100"
            >
              <RefreshCw className="w-5 h-5" />
            </button>

            <button className="p-2 text-gray-500 hover:text-brand-green transition-colors rounded-lg hover:bg-gray-100">
              <Settings className="w-5 h-5" />
            </button>
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
          {/* System Health Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-lg p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-100 rounded-xl">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">{systemSummary.healthy}</div>
                  <div className="text-sm text-gray-600">Healthy</div>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                {((systemSummary.healthy / systemSummary.total) * 100).toFixed(1)}% of systems
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl shadow-lg p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Activity className="w-6 h-6 text-blue-600" />
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">{systemSummary.avgUptime.toFixed(1)}%</div>
                  <div className="text-sm text-gray-600">Avg Uptime</div>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                {systemSummary.avgResponseTime.toFixed(0)}ms avg response
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
                  <Zap className="w-6 h-6 text-purple-600" />
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-purple-600">{systemSummary.totalRequests.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Req/Min</div>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                {systemSummary.avgErrorRate.toFixed(2)}% error rate
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-2xl shadow-lg p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-red-100 rounded-xl">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-red-600">{systemSummary.critical + systemSummary.offline}</div>
                  <div className="text-sm text-gray-600">Issues</div>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                {systemSummary.warning} warnings
              </div>
            </motion.div>
          </div>

          {/* Systems Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {systems.map((system, index) => (
              <motion.div
                key={system.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer"
                onClick={() => setSelectedSystem(selectedSystem === system.id ? null : system.id)}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <Server className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{system.name}</h3>
                      <p className="text-sm text-gray-600">{system.region} • v{system.version}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(system.status)}
                    <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(system.status)}`}>
                      {system.status}
                    </span>
                  </div>
                </div>

                {/* System Metrics */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-900">{system.uptime.toFixed(1)}%</div>
                    <div className="text-xs text-gray-600">Uptime</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-900">{system.responseTime}ms</div>
                    <div className="text-xs text-gray-600">Response</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-900">{system.cpuUsage}%</div>
                    <div className="text-xs text-gray-600">CPU</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-900">{system.memoryUsage}%</div>
                    <div className="text-xs text-gray-600">Memory</div>
                  </div>
                </div>

                {/* Resource Usage Bars */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span>CPU Usage</span>
                    <span>{system.cpuUsage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div 
                      className={`h-1.5 rounded-full transition-all duration-500 ${
                        system.cpuUsage > 80 ? 'bg-red-500' : 
                        system.cpuUsage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${system.cpuUsage}%` }}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span>Memory Usage</span>
                    <span>{system.memoryUsage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div 
                      className={`h-1.5 rounded-full transition-all duration-500 ${
                        system.memoryUsage > 80 ? 'bg-red-500' : 
                        system.memoryUsage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${system.memoryUsage}%` }}
                    />
                  </div>
                </div>

                {/* Alerts */}
                {system.alerts.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Bell className="w-4 h-4 text-red-500" />
                      <span className="text-sm font-medium text-gray-900">
                        {system.alerts.length} Active Alert{system.alerts.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {system.alerts.slice(0, 2).map((alert) => (
                        <div key={alert.id} className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                          {alert.message}
                        </div>
                      ))}
                      {system.alerts.length > 2 && (
                        <div className="text-xs text-gray-500">
                          +{system.alerts.length - 2} more alerts
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* System Actions */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onSystemAction(system.id, 'restart')
                      }}
                      className="flex-1 px-3 py-2 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                    >
                      Restart
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onSystemAction(system.id, 'scale')
                      }}
                      className="flex-1 px-3 py-2 text-xs bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                    >
                      Scale
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onSystemAction(system.id, 'stop')
                      }}
                      className="flex-1 px-3 py-2 text-xs bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                    >
                      Stop
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          {/* Security Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <Shield className="w-6 h-6 text-blue-600" />
                <div className="text-sm text-gray-600">Active Events</div>
              </div>
              <div className="text-3xl font-bold text-gray-900">{securitySummary.activeEvents}</div>
              <div className="text-sm text-gray-600">Require attention</div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600" />
                <div className="text-sm text-gray-600">Critical Events</div>
              </div>
              <div className="text-3xl font-bold text-red-600">{securitySummary.criticalEvents}</div>
              <div className="text-sm text-gray-600">Immediate action needed</div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <Eye className="w-6 h-6 text-orange-600" />
                <div className="text-sm text-gray-600">High Priority</div>
              </div>
              <div className="text-3xl font-bold text-orange-600">{securitySummary.highEvents}</div>
              <div className="text-sm text-gray-600">Review required</div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <Clock className="w-6 h-6 text-gray-600" />
                <div className="text-sm text-gray-600">Total Events</div>
              </div>
              <div className="text-3xl font-bold text-gray-900">{securitySummary.totalEvents}</div>
              <div className="text-sm text-gray-600">All time</div>
            </div>
          </div>

          {/* Security Events */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">Recent Security Events</h3>
              <div className="flex items-center gap-2">
                <select className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green">
                  <option value="all">All Events</option>
                  <option value="critical">Critical Only</option>
                  <option value="active">Active Only</option>
                </select>
              </div>
            </div>

            <div className="space-y-4">
              {securityEvents.slice(0, 10).map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-3 py-1 text-sm font-medium rounded-full ${getSeverityColor(event.severity)}`}>
                          {event.severity.toUpperCase()}
                        </span>
                        <span className="text-sm text-gray-600 capitalize">{event.type.replace('_', ' ')}</span>
                        <span className="text-sm text-gray-500">
                          {new Date(event.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-2">{event.description}</h4>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>Source: {event.source}</span>
                        {event.affectedUsers && (
                          <span>Affected Users: {event.affectedUsers}</span>
                        )}
                      </div>
                      {event.mitigationSteps && (
                        <div className="mt-3">
                          <h5 className="text-sm font-medium text-gray-900 mb-1">Mitigation Steps:</h5>
                          <ul className="text-sm text-gray-600 space-y-1">
                            {event.mitigationSteps.map((step, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-brand-green">•</span>
                                <span>{step}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <select
                        value={event.status}
                        onChange={(e) => onSecurityEventUpdate(event.id, e.target.value as any)}
                        className="px-3 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-brand-green"
                      >
                        <option value="active">Active</option>
                        <option value="investigating">Investigating</option>
                        <option value="resolved">Resolved</option>
                        <option value="false_positive">False Positive</option>
                      </select>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Logs Tab */}
      {activeTab === 'logs' && (
        <div className="space-y-6">
          {/* Log Filters */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">System Logs</h3>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search logs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green"
                  />
                </div>
                <select
                  value={logFilters.level}
                  onChange={(e) => setLogFilters(prev => ({ ...prev, level: e.target.value }))}
                  className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green"
                >
                  <option value="all">All Levels</option>
                  <option value="debug">Debug</option>
                  <option value="info">Info</option>
                  <option value="warn">Warning</option>
                  <option value="error">Error</option>
                  <option value="fatal">Fatal</option>
                </select>
                <select
                  value={logFilters.service}
                  onChange={(e) => setLogFilters(prev => ({ ...prev, service: e.target.value }))}
                  className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green"
                >
                  <option value="all">All Services</option>
                  <option value="api">API Server</option>
                  <option value="auth">Auth Service</option>
                  <option value="payment">Payment Service</option>
                  <option value="notification">Notification Service</option>
                </select>
                <button
                  onClick={() => onExportLogs('json', logFilters)}
                  className="px-4 py-2 bg-brand-green text-white rounded-lg hover:bg-opacity-90 transition-colors"
                >
                  <Download className="w-4 h-4 inline mr-2" />
                  Export
                </button>
              </div>
            </div>

            {/* Log Entries */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {logs
                .filter(log => {
                  if (logFilters.level !== 'all' && log.level !== logFilters.level) return false
                  if (logFilters.service !== 'all' && log.service !== logFilters.service) return false
                  if (searchQuery && !log.message.toLowerCase().includes(searchQuery.toLowerCase())) return false
                  return true
                })
                .slice(0, 50)
                .map((log, index) => (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.02 }}
                    className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg text-sm font-mono hover:bg-gray-100 transition-colors"
                  >
                    <span className="text-gray-500 min-w-20">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full min-w-16 text-center ${getLogLevelColor(log.level)}`}>
                      {log.level.toUpperCase()}
                    </span>
                    <span className="text-gray-600 min-w-24">[{log.service}]</span>
                    <span className="flex-1 text-gray-900">{log.message}</span>
                    {log.duration && (
                      <span className="text-gray-500 min-w-16 text-right">{log.duration}ms</span>
                    )}
                  </motion.div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}