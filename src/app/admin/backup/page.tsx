'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Shield,
  Database,
  HardDrive,
  Server,
  Cloud,
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  Upload,
  Trash2,
  RefreshCw,
  Activity,
  Settings,
  BarChart3,
  Zap,
  Archive
} from 'lucide-react'

interface BackupMetadata {
  id: string
  type: 'database' | 'files' | 'cache' | 'full'
  timestamp: Date
  size: number
  location: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  verified: boolean
  compressed: boolean
  encrypted: boolean
}

interface SystemStatus {
  services: Array<{
    name: string
    status: string
    activeEndpoint: string
    uptime: number
  }>
  recentEvents: any[]
  overallHealth: 'healthy' | 'degraded' | 'critical'
}

export default function BackupManagementPage() {
  const [backups, setBackups] = useState<BackupMetadata[]>([])
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null)
  const [backupStatus, setBackupStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedBackup, setSelectedBackup] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'backups' | 'system' | 'schedule'>('backups')

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const loadData = async () => {
    try {
      const [backupsRes, statusRes, systemRes] = await Promise.all([
        fetch('/api/admin/backup?action=list'),
        fetch('/api/admin/backup?action=status'),
        fetch('/api/admin/backup?action=system-status')
      ])

      const backupsData = await backupsRes.json()
      const statusData = await statusRes.json()
      const systemData = await systemRes.json()

      setBackups(backupsData)
      setBackupStatus(statusData)
      setSystemStatus(systemData)
    } catch (error) {
      console.error('Failed to load backup data:', error)
    } finally {
      setLoading(false)
    }
  }

  const createBackup = async (type: 'full' | 'database' | 'cache' | 'files') => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: `create-${type}` })
      })

      if (response.ok) {
        await loadData()
        alert(`${type} backup created successfully`)
      }
    } catch (error) {
      console.error('Failed to create backup:', error)
      alert('Failed to create backup')
    } finally {
      setLoading(false)
    }
  }

  const restoreBackup = async (backupId: string) => {
    if (!confirm('Are you sure you want to restore from this backup? This action cannot be undone.')) {
      return
    }

    try {
      setLoading(true)
      const response = await fetch('/api/admin/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore', backupId })
      })

      if (response.ok) {
        alert('Backup restored successfully')
        await loadData()
      }
    } catch (error) {
      console.error('Failed to restore backup:', error)
      alert('Failed to restore backup')
    } finally {
      setLoading(false)
    }
  }

  const deleteBackup = async (backupId: string) => {
    if (!confirm('Are you sure you want to delete this backup?')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/backup?backupId=${backupId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await loadData()
        alert('Backup deleted successfully')
      }
    } catch (error) {
      console.error('Failed to delete backup:', error)
      alert('Failed to delete backup')
    }
  }

  const cleanupBackups = async () => {
    try {
      const response = await fetch('/api/admin/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cleanup' })
      })

      if (response.ok) {
        await loadData()
        alert('Expired backups cleaned up successfully')
      }
    } catch (error) {
      console.error('Failed to cleanup backups:', error)
      alert('Failed to cleanup backups')
    }
  }

  const formatFileSize = (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    if (bytes === 0) return '0 Bytes'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100'
      case 'running': return 'text-blue-600 bg-blue-100'
      case 'failed': return 'text-red-600 bg-red-100'
      case 'pending': return 'text-yellow-600 bg-yellow-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-600'
      case 'degraded': return 'text-yellow-600'
      case 'critical': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  if (loading && !backups.length) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-brand-green mx-auto mb-4" />
          <p className="text-gray-600">Loading backup data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-brand-green to-brand-seafoam rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Backup & Failover Management</h1>
                <p className="text-sm text-gray-600">System backup and disaster recovery</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {systemStatus && (
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                  systemStatus.overallHealth === 'healthy' ? 'bg-green-100 text-green-800' :
                  systemStatus.overallHealth === 'degraded' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  <Activity className="w-4 h-4" />
                  System {systemStatus.overallHealth}
                </div>
              )}
              <button
                onClick={loadData}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Status Overview */}
        {backupStatus && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
          >
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Archive className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{backupStatus.totalBackups}</div>
                  <div className="text-sm text-gray-600">Total Backups</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <HardDrive className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{formatFileSize(backupStatus.totalSize)}</div>
                  <div className="text-sm text-gray-600">Total Size</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{backupStatus.successRate.toFixed(1)}%</div>
                  <div className="text-sm text-gray-600">Success Rate</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {backupStatus.lastBackup ? new Date(backupStatus.lastBackup).toLocaleDateString() : 'Never'}
                  </div>
                  <div className="text-sm text-gray-600">Last Backup</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Alerts */}
        {backupStatus?.alerts?.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 mb-8"
          >
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <h3 className="font-semibold text-yellow-900">System Alerts</h3>
            </div>
            <div className="space-y-2">
              {backupStatus.alerts.map((alert: string, index: number) => (
                <div key={index} className="text-yellow-800 text-sm">{alert}</div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-8 bg-gray-100 p-1 rounded-2xl w-fit">
          {[
            { id: 'backups', label: 'Backups', icon: Archive },
            { id: 'system', label: 'System Status', icon: Activity },
            { id: 'schedule', label: 'Schedule', icon: Clock }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-brand-green shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Backups Tab */}
        {activeTab === 'backups' && (
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Create Backup</h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                <button
                  onClick={() => createBackup('full')}
                  disabled={loading}
                  className="flex items-center gap-3 p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-brand-green hover:bg-green-50 transition-colors group"
                >
                  <div className="w-10 h-10 bg-brand-green bg-opacity-10 rounded-xl flex items-center justify-center group-hover:bg-opacity-20">
                    <Cloud className="w-5 h-5 text-brand-green" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-gray-900">Full Backup</div>
                    <div className="text-sm text-gray-600">Complete system</div>
                  </div>
                </button>

                <button
                  onClick={() => createBackup('database')}
                  disabled={loading}
                  className="flex items-center gap-3 p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-colors group"
                >
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-200">
                    <Database className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-gray-900">Database</div>
                    <div className="text-sm text-gray-600">PostgreSQL data</div>
                  </div>
                </button>

                <button
                  onClick={() => createBackup('cache')}
                  disabled={loading}
                  className="flex items-center gap-3 p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-colors group"
                >
                  <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center group-hover:bg-purple-200">
                    <Zap className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-gray-900">Cache</div>
                    <div className="text-sm text-gray-600">Redis data</div>
                  </div>
                </button>

                <button
                  onClick={() => createBackup('files')}
                  disabled={loading}
                  className="flex items-center gap-3 p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-orange-500 hover:bg-orange-50 transition-colors group"
                >
                  <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center group-hover:bg-orange-200">
                    <HardDrive className="w-5 h-5 text-orange-600" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-gray-900">Files</div>
                    <div className="text-sm text-gray-600">User uploads</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Backup List */}
            <div className="bg-white rounded-2xl shadow-lg">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">Recent Backups</h3>
                <button
                  onClick={cleanupBackups}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  <Trash2 className="w-4 h-4" />
                  Cleanup Expired
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-4 font-medium text-gray-900">Type</th>
                      <th className="text-left p-4 font-medium text-gray-900">Created</th>
                      <th className="text-left p-4 font-medium text-gray-900">Size</th>
                      <th className="text-left p-4 font-medium text-gray-900">Status</th>
                      <th className="text-left p-4 font-medium text-gray-900">Location</th>
                      <th className="text-right p-4 font-medium text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {backups.map((backup) => (
                      <tr key={backup.id} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              backup.type === 'full' ? 'bg-green-100' :
                              backup.type === 'database' ? 'bg-blue-100' :
                              backup.type === 'cache' ? 'bg-purple-100' :
                              'bg-orange-100'
                            }`}>
                              {backup.type === 'full' && <Cloud className="w-4 h-4 text-green-600" />}
                              {backup.type === 'database' && <Database className="w-4 h-4 text-blue-600" />}
                              {backup.type === 'cache' && <Zap className="w-4 h-4 text-purple-600" />}
                              {backup.type === 'files' && <HardDrive className="w-4 h-4 text-orange-600" />}
                            </div>
                            <span className="font-medium capitalize">{backup.type}</span>
                          </div>
                        </td>
                        <td className="p-4 text-sm text-gray-600">
                          {new Date(backup.timestamp).toLocaleString()}
                        </td>
                        <td className="p-4 text-sm text-gray-600">
                          {formatFileSize(backup.size)}
                        </td>
                        <td className="p-4">
                          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(backup.status)}`}>
                            {backup.status === 'completed' && <CheckCircle className="w-3 h-3" />}
                            {backup.status === 'running' && <RefreshCw className="w-3 h-3 animate-spin" />}
                            {backup.status === 'failed' && <AlertTriangle className="w-3 h-3" />}
                            {backup.status === 'pending' && <Clock className="w-3 h-3" />}
                            {backup.status}
                          </div>
                        </td>
                        <td className="p-4 text-sm text-gray-600 max-w-xs truncate">
                          {backup.location}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2 justify-end">
                            {backup.status === 'completed' && (
                              <button
                                onClick={() => restoreBackup(backup.id)}
                                className="text-blue-600 hover:text-blue-700 p-1"
                                title="Restore backup"
                              >
                                <Upload className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => deleteBackup(backup.id)}
                              className="text-red-600 hover:text-red-700 p-1"
                              title="Delete backup"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {backups.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No backups found. Create your first backup above.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* System Status Tab */}
        {activeTab === 'system' && systemStatus && (
          <div className="space-y-6">
            {/* System Health Overview */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">System Health</h3>
              <div className="space-y-4">
                {systemStatus.services.map((service) => (
                  <div key={service.name} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        service.status === 'operational' ? 'bg-green-500' : 'bg-red-500'
                      }`}></div>
                      <div>
                        <div className="font-medium text-gray-900 capitalize">{service.name.replace('-', ' ')}</div>
                        <div className="text-sm text-gray-600">Active: {service.activeEndpoint}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-medium ${service.status === 'operational' ? 'text-green-600' : 'text-red-600'}`}>
                        {service.status}
                      </div>
                      <div className="text-sm text-gray-600">{service.uptime}% uptime</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Events */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Failover Events</h3>
              <div className="space-y-3">
                {systemStatus.recentEvents.length > 0 ? (
                  systemStatus.recentEvents.map((event, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                      <div className={`w-2 h-2 rounded-full mt-2 ${
                        event.severity === 'critical' ? 'bg-red-500' :
                        event.severity === 'high' ? 'bg-orange-500' :
                        event.severity === 'medium' ? 'bg-yellow-500' :
                        'bg-blue-500'
                      }`}></div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{event.eventType.replace('_', ' ')}</div>
                        <div className="text-sm text-gray-600">{event.description}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(event.detectedAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    No recent failover events
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Schedule Tab */}
        {activeTab === 'schedule' && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Backup Schedule</h3>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-blue-900">Daily Full Backup</div>
                  <div className="text-sm text-blue-700">Enabled</div>
                </div>
                <div className="text-sm text-blue-700">Runs every day at 2:00 AM UTC</div>
              </div>
              
              <div className="p-4 bg-green-50 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-green-900">Hourly Database Backup</div>
                  <div className="text-sm text-green-700">Enabled</div>
                </div>
                <div className="text-sm text-green-700">Runs every hour</div>
              </div>
              
              <div className="p-4 bg-purple-50 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-purple-900">Weekly Archive</div>
                  <div className="text-sm text-purple-700">Enabled</div>
                </div>
                <div className="text-sm text-purple-700">Runs every Sunday at 1:00 AM UTC</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}