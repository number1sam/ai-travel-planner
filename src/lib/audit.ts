import { prisma } from '@/lib/prisma'
import { EncryptionService } from '@/lib/encryption'

export interface AuditLogEntry {
  userId?: string
  action: string
  resource: string
  resourceId?: string
  oldValue?: Record<string, any>
  newValue?: Record<string, any>
  ipAddress: string
  userAgent: string
  timestamp: Date
  sessionId?: string
  result: 'success' | 'failure' | 'error'
  errorMessage?: string
}

export interface SecurityAlert {
  userId?: string
  alertType: 'SUSPICIOUS_LOGIN' | 'MULTIPLE_FAILED_ATTEMPTS' | 'UNUSUAL_ACTIVITY' | 'DATA_BREACH' | 'UNAUTHORIZED_ACCESS'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  metadata: Record<string, any>
  ipAddress: string
  timestamp: Date
  resolved: boolean
}

export class AuditService {
  /**
   * Log user action for audit trail
   */
  static async logAction(entry: AuditLogEntry): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId: entry.userId,
          action: entry.action,
          resource: entry.resource,
          resourceId: entry.resourceId,
          oldValue: entry.oldValue ? JSON.stringify(entry.oldValue) : null,
          newValue: entry.newValue ? JSON.stringify(entry.newValue) : null,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          timestamp: entry.timestamp,
          sessionId: entry.sessionId,
          result: entry.result,
          errorMessage: entry.errorMessage
        }
      })

      // Check for suspicious patterns
      await this.analyzeSuspiciousActivity(entry)

      console.log(`AuditService: Logged action ${entry.action} for resource ${entry.resource}`)
    } catch (error) {
      console.error('AuditService: Error logging audit entry:', error)
      // Don't throw error to avoid breaking main functionality
    }
  }

  /**
   * Log authentication events
   */
  static async logAuthEvent(data: {
    userId?: string
    email: string
    eventType: 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'LOGOUT' | 'PASSWORD_RESET' | 'ACCOUNT_LOCKED'
    ipAddress: string
    userAgent: string
    sessionId?: string
    metadata?: Record<string, any>
  }): Promise<void> {
    await this.logAction({
      userId: data.userId,
      action: data.eventType,
      resource: 'authentication',
      resourceId: data.email,
      newValue: data.metadata,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      timestamp: new Date(),
      sessionId: data.sessionId,
      result: data.eventType.includes('FAILED') ? 'failure' : 'success'
    })

    // Check for multiple failed attempts
    if (data.eventType === 'LOGIN_FAILED') {
      await this.checkFailedLoginAttempts(data.email, data.ipAddress)
    }
  }

  /**
   * Log data access events
   */
  static async logDataAccess(data: {
    userId: string
    dataType: 'user_profile' | 'trip_data' | 'health_data' | 'payment_data' | 'admin_data'
    action: 'read' | 'create' | 'update' | 'delete' | 'export'
    recordId?: string
    ipAddress: string
    userAgent: string
    result: 'success' | 'failure'
  }): Promise<void> {
    await this.logAction({
      userId: data.userId,
      action: `DATA_${data.action.toUpperCase()}`,
      resource: data.dataType,
      resourceId: data.recordId,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      timestamp: new Date(),
      result: data.result
    })
  }

  /**
   * Log payment events
   */
  static async logPaymentEvent(data: {
    userId: string
    eventType: 'PAYMENT_INITIATED' | 'PAYMENT_SUCCESS' | 'PAYMENT_FAILED' | 'SUBSCRIPTION_CREATED' | 'SUBSCRIPTION_CANCELLED'
    amount?: number
    currency?: string
    paymentMethod?: string
    transactionId?: string
    ipAddress: string
    userAgent: string
  }): Promise<void> {
    await this.logAction({
      userId: data.userId,
      action: data.eventType,
      resource: 'payment',
      resourceId: data.transactionId,
      newValue: {
        amount: data.amount,
        currency: data.currency,
        paymentMethod: data.paymentMethod
      },
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      timestamp: new Date(),
      result: data.eventType.includes('FAILED') ? 'failure' : 'success'
    })
  }

  /**
   * Create security alert
   */
  static async createSecurityAlert(alert: SecurityAlert): Promise<void> {
    try {
      await prisma.securityAlert.create({
        data: {
          userId: alert.userId,
          alertType: alert.alertType,
          severity: alert.severity,
          description: alert.description,
          metadata: JSON.stringify(alert.metadata),
          ipAddress: alert.ipAddress,
          timestamp: alert.timestamp,
          resolved: false
        }
      })

      // Send critical alerts to security team
      if (alert.severity === 'critical') {
        await this.notifySecurityTeam(alert)
      }

      console.log(`AuditService: Created security alert: ${alert.alertType}`)
    } catch (error) {
      console.error('AuditService: Error creating security alert:', error)
    }
  }

  /**
   * Analyze suspicious activity patterns
   */
  private static async analyzeSuspiciousActivity(entry: AuditLogEntry): Promise<void> {
    try {
      // Check for rapid successive actions
      if (entry.userId) {
        const recentActions = await prisma.auditLog.count({
          where: {
            userId: entry.userId,
            timestamp: {
              gte: new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
            }
          }
        })

        if (recentActions > 50) { // More than 50 actions in 5 minutes
          await this.createSecurityAlert({
            userId: entry.userId,
            alertType: 'UNUSUAL_ACTIVITY',
            severity: 'medium',
            description: 'User performing unusually high number of actions',
            metadata: {
              actionCount: recentActions,
              timeWindow: '5 minutes',
              lastAction: entry.action
            },
            ipAddress: entry.ipAddress,
            timestamp: new Date(),
            resolved: false
          })
        }
      }

      // Check for unusual IP addresses
      if (entry.userId && entry.action === 'LOGIN_SUCCESS') {
        const userLogins = await prisma.auditLog.findMany({
          where: {
            userId: entry.userId,
            action: 'LOGIN_SUCCESS',
            timestamp: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
            }
          },
          select: { ipAddress: true },
          distinct: ['ipAddress']
        })

        const knownIPs = userLogins.map(log => log.ipAddress)
        
        if (!knownIPs.includes(entry.ipAddress) && knownIPs.length > 0) {
          await this.createSecurityAlert({
            userId: entry.userId,
            alertType: 'SUSPICIOUS_LOGIN',
            severity: 'high',
            description: 'Login from new IP address',
            metadata: {
              newIP: entry.ipAddress,
              knownIPs: knownIPs,
              userAgent: entry.userAgent
            },
            ipAddress: entry.ipAddress,
            timestamp: new Date(),
            resolved: false
          })
        }
      }
    } catch (error) {
      console.error('AuditService: Error analyzing suspicious activity:', error)
    }
  }

  /**
   * Check for failed login attempts
   */
  private static async checkFailedLoginAttempts(email: string, ipAddress: string): Promise<void> {
    try {
      const failedAttempts = await prisma.auditLog.count({
        where: {
          action: 'LOGIN_FAILED',
          resourceId: email,
          timestamp: {
            gte: new Date(Date.now() - 15 * 60 * 1000) // Last 15 minutes
          }
        }
      })

      if (failedAttempts >= 5) {
        await this.createSecurityAlert({
          alertType: 'MULTIPLE_FAILED_ATTEMPTS',
          severity: 'high',
          description: `Multiple failed login attempts for ${email}`,
          metadata: {
            email: email,
            attemptCount: failedAttempts,
            timeWindow: '15 minutes'
          },
          ipAddress: ipAddress,
          timestamp: new Date(),
          resolved: false
        })

        // Optional: Temporarily lock the account
        // await this.lockAccount(email)
      }
    } catch (error) {
      console.error('AuditService: Error checking failed login attempts:', error)
    }
  }

  /**
   * Get audit logs with filtering
   */
  static async getAuditLogs(filters: {
    userId?: string
    action?: string
    resource?: string
    startDate?: Date
    endDate?: Date
    limit?: number
    offset?: number
  }): Promise<{
    logs: any[]
    total: number
  }> {
    try {
      const where: any = {}

      if (filters.userId) where.userId = filters.userId
      if (filters.action) where.action = filters.action
      if (filters.resource) where.resource = filters.resource
      if (filters.startDate || filters.endDate) {
        where.timestamp = {}
        if (filters.startDate) where.timestamp.gte = filters.startDate
        if (filters.endDate) where.timestamp.lte = filters.endDate
      }

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          orderBy: { timestamp: 'desc' },
          take: filters.limit || 100,
          skip: filters.offset || 0,
          include: {
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        }),
        prisma.auditLog.count({ where })
      ])

      return { logs, total }
    } catch (error) {
      console.error('AuditService: Error retrieving audit logs:', error)
      return { logs: [], total: 0 }
    }
  }

  /**
   * Get security alerts
   */
  static async getSecurityAlerts(filters: {
    severity?: string
    resolved?: boolean
    limit?: number
    offset?: number
  }): Promise<{
    alerts: any[]
    total: number
  }> {
    try {
      const where: any = {}

      if (filters.severity) where.severity = filters.severity
      if (filters.resolved !== undefined) where.resolved = filters.resolved

      const [alerts, total] = await Promise.all([
        prisma.securityAlert.findMany({
          where,
          orderBy: { timestamp: 'desc' },
          take: filters.limit || 50,
          skip: filters.offset || 0,
          include: {
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        }),
        prisma.securityAlert.count({ where })
      ])

      return { alerts, total }
    } catch (error) {
      console.error('AuditService: Error retrieving security alerts:', error)
      return { alerts: [], total: 0 }
    }
  }

  /**
   * Resolve security alert
   */
  static async resolveSecurityAlert(alertId: string, resolvedBy: string): Promise<void> {
    try {
      await prisma.securityAlert.update({
        where: { id: alertId },
        data: {
          resolved: true,
          resolvedAt: new Date(),
          resolvedBy: resolvedBy
        }
      })

      console.log(`AuditService: Security alert ${alertId} resolved by ${resolvedBy}`)
    } catch (error) {
      console.error('AuditService: Error resolving security alert:', error)
      throw error
    }
  }

  /**
   * Generate compliance report
   */
  static async generateComplianceReport(startDate: Date, endDate: Date): Promise<{
    summary: {
      totalActions: number
      failedActions: number
      uniqueUsers: number
      securityAlerts: number
    }
    topActions: Array<{ action: string; count: number }>
    securitySummary: Array<{ alertType: string; count: number }>
  }> {
    try {
      const [
        totalActions,
        failedActions,
        uniqueUsers,
        securityAlerts,
        topActions,
        securitySummary
      ] = await Promise.all([
        prisma.auditLog.count({
          where: {
            timestamp: { gte: startDate, lte: endDate }
          }
        }),
        prisma.auditLog.count({
          where: {
            timestamp: { gte: startDate, lte: endDate },
            result: 'failure'
          }
        }),
        prisma.auditLog.findMany({
          where: {
            timestamp: { gte: startDate, lte: endDate }
          },
          select: { userId: true },
          distinct: ['userId']
        }),
        prisma.securityAlert.count({
          where: {
            timestamp: { gte: startDate, lte: endDate }
          }
        }),
        prisma.auditLog.groupBy({
          by: ['action'],
          where: {
            timestamp: { gte: startDate, lte: endDate }
          },
          _count: true,
          orderBy: { _count: { action: 'desc' } },
          take: 10
        }),
        prisma.securityAlert.groupBy({
          by: ['alertType'],
          where: {
            timestamp: { gte: startDate, lte: endDate }
          },
          _count: true,
          orderBy: { _count: { alertType: 'desc' } }
        })
      ])

      return {
        summary: {
          totalActions,
          failedActions,
          uniqueUsers: uniqueUsers.length,
          securityAlerts
        },
        topActions: topActions.map(item => ({
          action: item.action,
          count: item._count
        })),
        securitySummary: securitySummary.map(item => ({
          alertType: item.alertType,
          count: item._count
        }))
      }
    } catch (error) {
      console.error('AuditService: Error generating compliance report:', error)
      throw error
    }
  }

  /**
   * Notify security team of critical alerts
   */
  private static async notifySecurityTeam(alert: SecurityAlert): Promise<void> {
    try {
      // In production, this would send notifications via:
      // - Email to security team
      // - Slack/Teams webhook
      // - PagerDuty/OpsGenie
      // - SIEM system integration

      console.log(`CRITICAL SECURITY ALERT: ${alert.alertType}`)
      console.log(`Description: ${alert.description}`)
      console.log(`User ID: ${alert.userId || 'N/A'}`)
      console.log(`IP Address: ${alert.ipAddress}`)
      console.log(`Timestamp: ${alert.timestamp.toISOString()}`)
      console.log(`Metadata:`, alert.metadata)

      // Example: Send to monitoring service
      // await monitoringService.sendAlert({
      //   title: `Security Alert: ${alert.alertType}`,
      //   description: alert.description,
      //   severity: alert.severity,
      //   metadata: alert.metadata
      // })
    } catch (error) {
      console.error('AuditService: Error notifying security team:', error)
    }
  }
}