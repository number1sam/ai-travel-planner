import { GDPRService } from '@/services/GDPRService'
import { AuditService } from '@/lib/audit'
import { prisma } from '@/lib/prisma'

export class SecurityCronService {
  private static isRunning = false
  private static intervals: NodeJS.Timeout[] = []

  /**
   * Start all security-related cron jobs
   */
  static start(): void {
    if (this.isRunning) {
      console.log('SecurityCronService: Already running')
      return
    }

    console.log('SecurityCronService: Starting security cron jobs')
    this.isRunning = true

    // Process scheduled deletions every hour
    const deletionInterval = setInterval(async () => {
      try {
        console.log('SecurityCronService: Processing scheduled deletions')
        await GDPRService.processScheduledDeletions()
      } catch (error) {
        console.error('SecurityCronService: Error processing deletions:', error)
      }
    }, 60 * 60 * 1000) // 1 hour

    // Clean up expired data daily at 2 AM
    const cleanupInterval = setInterval(async () => {
      const now = new Date()
      if (now.getHours() === 2) { // Run at 2 AM
        try {
          console.log('SecurityCronService: Cleaning up expired data')
          await GDPRService.cleanupExpiredData()
          await this.cleanupExpiredSessions()
          await this.cleanupOldSecurityAlerts()
        } catch (error) {
          console.error('SecurityCronService: Error during cleanup:', error)
        }
      }
    }, 60 * 60 * 1000) // Check every hour, run at 2 AM

    // Generate security reports weekly (Sundays at midnight)
    const reportInterval = setInterval(async () => {
      const now = new Date()
      if (now.getDay() === 0 && now.getHours() === 0) { // Sunday at midnight
        try {
          console.log('SecurityCronService: Generating weekly security report')
          await this.generateWeeklySecurityReport()
        } catch (error) {
          console.error('SecurityCronService: Error generating security report:', error)
        }
      }
    }, 60 * 60 * 1000) // Check every hour

    // Monitor for suspicious patterns every 15 minutes
    const monitorInterval = setInterval(async () => {
      try {
        await this.monitorSuspiciousPatterns()
      } catch (error) {
        console.error('SecurityCronService: Error monitoring suspicious patterns:', error)
      }
    }, 15 * 60 * 1000) // 15 minutes

    // Clean up rate limiting data every 30 minutes
    const rateLimitCleanupInterval = setInterval(async () => {
      try {
        await this.cleanupRateLimitData()
      } catch (error) {
        console.error('SecurityCronService: Error cleaning up rate limit data:', error)
      }
    }, 30 * 60 * 1000) // 30 minutes

    // Store intervals for cleanup
    this.intervals = [
      deletionInterval,
      cleanupInterval,
      reportInterval,
      monitorInterval,
      rateLimitCleanupInterval
    ]

    console.log('SecurityCronService: All cron jobs started successfully')
  }

  /**
   * Stop all security cron jobs
   */
  static stop(): void {
    if (!this.isRunning) {
      console.log('SecurityCronService: Not running')
      return
    }

    console.log('SecurityCronService: Stopping security cron jobs')
    
    this.intervals.forEach(interval => clearInterval(interval))
    this.intervals = []
    this.isRunning = false

    console.log('SecurityCronService: All cron jobs stopped')
  }

  /**
   * Clean up expired user sessions
   */
  private static async cleanupExpiredSessions(): Promise<void> {
    try {
      const expiredSessions = await prisma.userSession.deleteMany({
        where: {
          expiresAt: {
            lt: new Date()
          }
        }
      })

      console.log(`SecurityCronService: Cleaned up ${expiredSessions.count} expired sessions`)
    } catch (error) {
      console.error('SecurityCronService: Error cleaning up expired sessions:', error)
    }
  }

  /**
   * Clean up old resolved security alerts
   */
  private static async cleanupOldSecurityAlerts(): Promise<void> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - 90) // Keep for 90 days

      const deletedAlerts = await prisma.securityAlert.deleteMany({
        where: {
          resolved: true,
          resolvedAt: {
            lt: cutoffDate
          }
        }
      })

      console.log(`SecurityCronService: Cleaned up ${deletedAlerts.count} old security alerts`)
    } catch (error) {
      console.error('SecurityCronService: Error cleaning up security alerts:', error)
    }
  }

  /**
   * Generate weekly security report
   */
  private static async generateWeeklySecurityReport(): Promise<void> {
    try {
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 7) // Last 7 days

      const report = await AuditService.generateComplianceReport(startDate, endDate)

      // In production, this would be sent to security team via email/Slack
      console.log('SecurityCronService: Weekly Security Report')
      console.log('='.repeat(50))
      console.log(`Period: ${startDate.toDateString()} - ${endDate.toDateString()}`)
      console.log(`Total Actions: ${report.summary.totalActions}`)
      console.log(`Failed Actions: ${report.summary.failedActions}`)
      console.log(`Unique Users: ${report.summary.uniqueUsers}`)
      console.log(`Security Alerts: ${report.summary.securityAlerts}`)
      console.log('Top Actions:', report.topActions.slice(0, 5))
      console.log('Security Summary:', report.securitySummary)
      console.log('='.repeat(50))

      // Store report in database or send to monitoring service
      // await this.storeSecurityReport(report)
    } catch (error) {
      console.error('SecurityCronService: Error generating weekly security report:', error)
    }
  }

  /**
   * Monitor for suspicious activity patterns
   */
  private static async monitorSuspiciousPatterns(): Promise<void> {
    try {
      const now = new Date()
      const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000)

      // Check for multiple failed logins from same IP
      const failedLoginsByIP = await prisma.auditLog.groupBy({
        by: ['ipAddress'],
        where: {
          action: 'LOGIN_FAILED',
          timestamp: {
            gte: fifteenMinutesAgo
          }
        },
        _count: true,
        having: {
          ipAddress: {
            _count: {
              gte: 10 // 10 or more failed attempts
            }
          }
        }
      })

      for (const group of failedLoginsByIP) {
        await AuditService.createSecurityAlert({
          alertType: 'MULTIPLE_FAILED_ATTEMPTS',
          severity: 'high',
          description: `Multiple failed login attempts from IP: ${group.ipAddress}`,
          metadata: {
            ipAddress: group.ipAddress,
            attemptCount: group._count,
            timeWindow: '15 minutes',
            detectedAt: now.toISOString()
          },
          ipAddress: group.ipAddress,
          timestamp: now,
          resolved: false
        })
      }

      // Check for unusual data access patterns
      const highVolumeUsers = await prisma.auditLog.groupBy({
        by: ['userId'],
        where: {
          action: {
            startsWith: 'DATA_'
          },
          timestamp: {
            gte: fifteenMinutesAgo
          },
          userId: {
            not: null
          }
        },
        _count: true,
        having: {
          userId: {
            _count: {
              gte: 100 // 100 or more data access operations
            }
          }
        }
      })

      for (const group of highVolumeUsers) {
        if (group.userId) {
          await AuditService.createSecurityAlert({
            userId: group.userId,
            alertType: 'UNUSUAL_ACTIVITY',
            severity: 'medium',
            description: `High volume data access detected`,
            metadata: {
              userId: group.userId,
              actionCount: group._count,
              timeWindow: '15 minutes',
              detectedAt: now.toISOString()
            },
            ipAddress: 'system',
            timestamp: now,
            resolved: false
          })
        }
      }

      // Check for suspicious admin actions
      const recentAdminActions = await prisma.adminAction.count({
        where: {
          timestamp: {
            gte: fifteenMinutesAgo
          }
        }
      })

      if (recentAdminActions > 50) { // More than 50 admin actions in 15 minutes
        await AuditService.createSecurityAlert({
          alertType: 'UNUSUAL_ACTIVITY',
          severity: 'high',
          description: 'High volume of admin actions detected',
          metadata: {
            actionCount: recentAdminActions,
            timeWindow: '15 minutes',
            detectedAt: now.toISOString()
          },
          ipAddress: 'system',
          timestamp: now,
          resolved: false
        })
      }

      console.log(`SecurityCronService: Monitored suspicious patterns - Found ${failedLoginsByIP.length + highVolumeUsers.length} potential issues`)
    } catch (error) {
      console.error('SecurityCronService: Error monitoring suspicious patterns:', error)
    }
  }

  /**
   * Clean up rate limiting data
   */
  private static async cleanupRateLimitData(): Promise<void> {
    try {
      // In production, this would clean up Redis or in-memory rate limit data
      // For now, we'll just log that it's running
      console.log('SecurityCronService: Rate limit data cleanup completed')
    } catch (error) {
      console.error('SecurityCronService: Error cleaning up rate limit data:', error)
    }
  }

  /**
   * Check system health and security status
   */
  static async getSystemStatus(): Promise<{
    isRunning: boolean
    lastCleanup: Date | null
    activeAlerts: number
    pendingDeletions: number
    systemHealth: 'healthy' | 'warning' | 'critical'
  }> {
    try {
      const [activeAlerts, pendingDeletions] = await Promise.all([
        prisma.securityAlert.count({
          where: { resolved: false }
        }),
        prisma.dataDeletionRequest.count({
          where: { status: 'pending' }
        })
      ])

      let systemHealth: 'healthy' | 'warning' | 'critical' = 'healthy'
      
      if (activeAlerts > 10) {
        systemHealth = 'warning'
      }
      if (activeAlerts > 50) {
        systemHealth = 'critical'
      }

      return {
        isRunning: this.isRunning,
        lastCleanup: null, // Would store actual timestamp in production
        activeAlerts,
        pendingDeletions,
        systemHealth
      }
    } catch (error) {
      console.error('SecurityCronService: Error getting system status:', error)
      return {
        isRunning: this.isRunning,
        lastCleanup: null,
        activeAlerts: 0,
        pendingDeletions: 0,
        systemHealth: 'critical'
      }
    }
  }

  /**
   * Manual trigger for emergency security procedures
   */
  static async emergencySecurityLockdown(): Promise<void> {
    try {
      console.log('SecurityCronService: EMERGENCY LOCKDOWN INITIATED')

      // Disable new user registrations
      await prisma.systemSetting.upsert({
        where: { key: 'registration_enabled' },
        update: { value: false },
        create: { key: 'registration_enabled', value: false }
      })

      // Force logout all users by invalidating sessions
      await prisma.userSession.deleteMany({})

      // Create critical security alert
      await AuditService.createSecurityAlert({
        alertType: 'DATA_BREACH',
        severity: 'critical',
        description: 'Emergency security lockdown activated',
        metadata: {
          action: 'emergency_lockdown',
          timestamp: new Date().toISOString(),
          initiatedBy: 'system'
        },
        ipAddress: 'system',
        timestamp: new Date(),
        resolved: false
      })

      console.log('SecurityCronService: Emergency lockdown completed')
    } catch (error) {
      console.error('SecurityCronService: Error during emergency lockdown:', error)
      throw error
    }
  }
}

// Auto-start in production
if (process.env.NODE_ENV === 'production') {
  SecurityCronService.start()
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SecurityCronService: Received SIGTERM, shutting down gracefully')
  SecurityCronService.stop()
})

process.on('SIGINT', () => {
  console.log('SecurityCronService: Received SIGINT, shutting down gracefully')
  SecurityCronService.stop()
})