import { prisma } from '@/lib/prisma'
import { BackupService } from './BackupService'

export interface ServiceEndpoint {
  name: string
  url: string
  priority: number // 1 = primary, 2 = secondary, etc.
  status: 'active' | 'inactive' | 'degraded' | 'failed'
  healthCheck: string
  lastHealthCheck?: Date
  responseTime?: number
  errorCount: number
  region: string
}

export interface FailoverConfiguration {
  serviceName: string
  endpoints: ServiceEndpoint[]
  healthCheckInterval: number // seconds
  failoverThreshold: number // number of failed checks before failover
  autoFailback: boolean
  notifications: {
    email: string[]
    slack?: string
    webhooks?: string[]
  }
}

export interface SystemHealthMetrics {
  serviceType: string
  serviceName: string
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown'
  responseTime?: number
  errorRate?: number
  cpuUsage?: number
  memoryUsage?: number
  diskUsage?: number
  connectionCount?: number
  alerts?: string[]
  metadata?: any
}

export class FailoverService {
  private static healthCheckIntervals: Map<string, NodeJS.Timeout> = new Map()
  private static serviceConfigurations: Map<string, FailoverConfiguration> = new Map()
  
  // Service configurations for different components
  private static readonly DEFAULT_CONFIGURATIONS: FailoverConfiguration[] = [
    {
      serviceName: 'database',
      endpoints: [
        {
          name: 'primary-db',
          url: process.env.DATABASE_URL || '',
          priority: 1,
          status: 'active',
          healthCheck: 'postgresql://health',
          errorCount: 0,
          region: 'us-east-1'
        },
        {
          name: 'replica-db',
          url: process.env.DATABASE_REPLICA_URL || '',
          priority: 2,
          status: 'active',
          healthCheck: 'postgresql://replica/health',
          errorCount: 0,
          region: 'us-west-2'
        }
      ],
      healthCheckInterval: 30,
      failoverThreshold: 3,
      autoFailback: true,
      notifications: {
        email: ['ops@travelplanner.com', 'alerts@travelplanner.com']
      }
    },
    {
      serviceName: 'redis-cache',
      endpoints: [
        {
          name: 'primary-redis',
          url: process.env.REDIS_URL || '',
          priority: 1,
          status: 'active',
          healthCheck: 'redis://ping',
          errorCount: 0,
          region: 'us-east-1'
        },
        {
          name: 'secondary-redis',
          url: process.env.REDIS_BACKUP_URL || '',
          priority: 2,
          status: 'active',
          healthCheck: 'redis://backup/ping',
          errorCount: 0,
          region: 'us-west-2'
        }
      ],
      healthCheckInterval: 15,
      failoverThreshold: 2,
      autoFailback: true,
      notifications: {
        email: ['ops@travelplanner.com']
      }
    },
    {
      serviceName: 'payment-api',
      endpoints: [
        {
          name: 'stripe-primary',
          url: 'https://api.stripe.com',
          priority: 1,
          status: 'active',
          healthCheck: '/v1/charges',
          errorCount: 0,
          region: 'global'
        },
        {
          name: 'paypal-backup',
          url: 'https://api.paypal.com',
          priority: 2,
          status: 'active',
          healthCheck: '/v1/payments',
          errorCount: 0,
          region: 'global'
        }
      ],
      healthCheckInterval: 60,
      failoverThreshold: 5,
      autoFailback: false, // Manual failback for payment services
      notifications: {
        email: ['ops@travelplanner.com', 'finance@travelplanner.com']
      }
    },
    {
      serviceName: 'ai-service',
      endpoints: [
        {
          name: 'openai-primary',
          url: 'https://api.openai.com',
          priority: 1,
          status: 'active',
          healthCheck: '/v1/models',
          errorCount: 0,
          region: 'global'
        },
        {
          name: 'claude-backup',
          url: 'https://api.anthropic.com',
          priority: 2,
          status: 'active',
          healthCheck: '/v1/messages',
          errorCount: 0,
          region: 'global'
        }
      ],
      healthCheckInterval: 45,
      failoverThreshold: 3,
      autoFailback: true,
      notifications: {
        email: ['ops@travelplanner.com', 'dev@travelplanner.com']
      }
    }
  ]

  /**
   * Initialize failover service with configurations
   */
  static initialize(): void {
    console.log('FailoverService: Initializing failover configurations')
    
    // Load configurations
    for (const config of this.DEFAULT_CONFIGURATIONS) {
      this.serviceConfigurations.set(config.serviceName, config)
      
      // Start health check monitoring
      this.startHealthCheckMonitoring(config.serviceName)
    }

    // Start system health monitoring
    this.startSystemHealthMonitoring()
    
    console.log(`FailoverService: Initialized ${this.DEFAULT_CONFIGURATIONS.length} service configurations`)
  }

  /**
   * Start health check monitoring for a service
   */
  private static startHealthCheckMonitoring(serviceName: string): void {
    const config = this.serviceConfigurations.get(serviceName)
    if (!config) return

    const interval = setInterval(async () => {
      await this.performHealthCheck(serviceName)
    }, config.healthCheckInterval * 1000)

    this.healthCheckIntervals.set(serviceName, interval)
    console.log(`FailoverService: Started health monitoring for ${serviceName}`)
  }

  /**
   * Perform health check for a service
   */
  private static async performHealthCheck(serviceName: string): Promise<void> {
    const config = this.serviceConfigurations.get(serviceName)
    if (!config) return

    for (const endpoint of config.endpoints) {
      if (endpoint.status === 'failed') continue // Skip failed endpoints

      try {
        const startTime = Date.now()
        const isHealthy = await this.checkEndpointHealth(endpoint)
        const responseTime = Date.now() - startTime

        endpoint.lastHealthCheck = new Date()
        endpoint.responseTime = responseTime

        if (isHealthy) {
          // Reset error count on successful check
          endpoint.errorCount = 0
          
          if (endpoint.status !== 'active') {
            await this.handleServiceRecovery(serviceName, endpoint)
          }
        } else {
          endpoint.errorCount++
          
          if (endpoint.errorCount >= config.failoverThreshold) {
            await this.handleServiceFailure(serviceName, endpoint)
          }
        }

        // Update system health metrics
        await this.updateSystemHealth(serviceName, endpoint, isHealthy, responseTime)

      } catch (error) {
        console.error(`FailoverService: Health check failed for ${endpoint.name}:`, error)
        endpoint.errorCount++
        
        if (endpoint.errorCount >= config.failoverThreshold) {
          await this.handleServiceFailure(serviceName, endpoint)
        }
      }
    }
  }

  /**
   * Check individual endpoint health
   */
  private static async checkEndpointHealth(endpoint: ServiceEndpoint): Promise<boolean> {
    try {
      switch (endpoint.name.split('-')[0]) {
        case 'primary':
        case 'replica':
          // Database health check
          if (endpoint.name.includes('db')) {
            await prisma.$queryRaw`SELECT 1`
            return true
          }
          break
          
        case 'redis':
          // Redis health check would go here
          return true
          
        default:
          // HTTP service health check
          const response = await fetch(endpoint.url + endpoint.healthCheck, {
            method: 'GET',
            timeout: 5000
          })
          return response.ok
      }
      
      return true
    } catch (error) {
      return false
    }
  }

  /**
   * Handle service failure and initiate failover
   */
  private static async handleServiceFailure(serviceName: string, failedEndpoint: ServiceEndpoint): Promise<void> {
    console.error(`FailoverService: Service failure detected for ${failedEndpoint.name}`)
    
    // Mark endpoint as failed
    failedEndpoint.status = 'failed'
    
    // Log failover event
    await this.logFailoverEvent({
      serviceType: serviceName,
      serviceName: failedEndpoint.name,
      eventType: 'failure_detected',
      severity: failedEndpoint.priority === 1 ? 'critical' : 'high',
      description: `Service ${failedEndpoint.name} failed after ${failedEndpoint.errorCount} consecutive health check failures`,
      metadata: {
        endpoint: failedEndpoint,
        errorCount: failedEndpoint.errorCount,
        lastHealthCheck: failedEndpoint.lastHealthCheck
      }
    })

    // Find next available endpoint
    const config = this.serviceConfigurations.get(serviceName)
    if (!config) return

    const nextEndpoint = config.endpoints
      .filter(e => e.status === 'active' && e.name !== failedEndpoint.name)
      .sort((a, b) => a.priority - b.priority)[0]

    if (nextEndpoint) {
      await this.initiateFailover(serviceName, failedEndpoint, nextEndpoint)
    } else {
      // No healthy endpoints available - critical failure
      await this.handleCriticalFailure(serviceName)
    }
  }

  /**
   * Initiate failover to backup endpoint
   */
  private static async initiateFailover(
    serviceName: string, 
    failedEndpoint: ServiceEndpoint, 
    targetEndpoint: ServiceEndpoint
  ): Promise<void> {
    console.log(`FailoverService: Initiating failover from ${failedEndpoint.name} to ${targetEndpoint.name}`)
    
    try {
      // Log failover initiation
      await this.logFailoverEvent({
        serviceType: serviceName,
        serviceName: targetEndpoint.name,
        eventType: 'failover_initiated',
        severity: 'high',
        description: `Failover initiated from ${failedEndpoint.name} to ${targetEndpoint.name}`,
        metadata: {
          from: failedEndpoint,
          to: targetEndpoint
        }
      })

      // Perform service-specific failover logic
      switch (serviceName) {
        case 'database':
          await this.performDatabaseFailover(failedEndpoint, targetEndpoint)
          break
        case 'redis-cache':
          await this.performCacheFailover(failedEndpoint, targetEndpoint)
          break
        case 'payment-api':
          await this.performPaymentFailover(failedEndpoint, targetEndpoint)
          break
        case 'ai-service':
          await this.performAIServiceFailover(failedEndpoint, targetEndpoint)
          break
      }

      // Create emergency backup if primary service failed
      if (failedEndpoint.priority === 1) {
        await BackupService.performFullBackup()
      }

      // Send notifications
      await this.sendFailoverNotifications(serviceName, failedEndpoint, targetEndpoint)

      // Log successful failover
      await this.logFailoverEvent({
        serviceType: serviceName,
        serviceName: targetEndpoint.name,
        eventType: 'failover_completed',
        severity: 'medium',
        description: `Failover completed successfully to ${targetEndpoint.name}`,
        metadata: {
          from: failedEndpoint,
          to: targetEndpoint,
          duration: Date.now() - (failedEndpoint.lastHealthCheck?.getTime() || Date.now())
        }
      })

    } catch (error) {
      console.error(`FailoverService: Failover failed:`, error)
      await this.handleCriticalFailure(serviceName)
    }
  }

  /**
   * Handle service recovery
   */
  private static async handleServiceRecovery(serviceName: string, recoveredEndpoint: ServiceEndpoint): Promise<void> {
    console.log(`FailoverService: Service recovery detected for ${recoveredEndpoint.name}`)
    
    recoveredEndpoint.status = 'active'
    
    // Log recovery event
    await this.logFailoverEvent({
      serviceType: serviceName,
      serviceName: recoveredEndpoint.name,
      eventType: 'service_restored',
      severity: 'low',
      description: `Service ${recoveredEndpoint.name} has been restored`,
      metadata: {
        endpoint: recoveredEndpoint,
        downtime: Date.now() - (recoveredEndpoint.lastHealthCheck?.getTime() || Date.now())
      },
      resolved: true,
      resolvedAt: new Date()
    })

    const config = this.serviceConfigurations.get(serviceName)
    if (config?.autoFailback && recoveredEndpoint.priority === 1) {
      // Automatically failback to primary if it's recovered and auto-failback is enabled
      await this.performFailback(serviceName, recoveredEndpoint)
    }
  }

  /**
   * Handle critical failure when no endpoints are available
   */
  private static async handleCriticalFailure(serviceName: string): Promise<void> {
    console.error(`FailoverService: CRITICAL FAILURE - No healthy endpoints available for ${serviceName}`)
    
    await this.logFailoverEvent({
      serviceType: serviceName,
      serviceName: 'system',
      eventType: 'critical_failure',
      severity: 'critical',
      description: `All endpoints failed for ${serviceName} - service unavailable`,
      metadata: {
        service: serviceName,
        timestamp: new Date()
      }
    })

    // Emergency procedures
    switch (serviceName) {
      case 'database':
        // Try to restore from latest backup
        console.log('FailoverService: Attempting emergency database restore')
        break
      case 'payment-api':
        // Switch to maintenance mode for payments
        console.log('FailoverService: Enabling payment maintenance mode')
        break
    }

    // Send critical alerts
    await this.sendCriticalAlert(serviceName)
  }

  /**
   * Perform database failover
   */
  private static async performDatabaseFailover(
    failed: ServiceEndpoint, 
    target: ServiceEndpoint
  ): Promise<void> {
    // Update connection string environment variable
    process.env.DATABASE_URL = target.url
    
    // Restart Prisma connection
    await prisma.$disconnect()
    // New connection will use updated URL
  }

  /**
   * Perform cache failover
   */
  private static async performCacheFailover(
    failed: ServiceEndpoint, 
    target: ServiceEndpoint
  ): Promise<void> {
    // Update Redis connection
    process.env.REDIS_URL = target.url
    console.log(`FailoverService: Switched Redis to ${target.name}`)
  }

  /**
   * Perform payment service failover
   */
  private static async performPaymentFailover(
    failed: ServiceEndpoint, 
    target: ServiceEndpoint
  ): Promise<void> {
    // Switch payment provider
    if (failed.name.includes('stripe') && target.name.includes('paypal')) {
      process.env.PAYMENT_PROVIDER = 'paypal'
    } else if (failed.name.includes('paypal') && target.name.includes('stripe')) {
      process.env.PAYMENT_PROVIDER = 'stripe'
    }
    console.log(`FailoverService: Switched payment provider to ${target.name}`)
  }

  /**
   * Perform AI service failover
   */
  private static async performAIServiceFailover(
    failed: ServiceEndpoint, 
    target: ServiceEndpoint
  ): Promise<void> {
    // Switch AI provider
    if (failed.name.includes('openai')) {
      process.env.AI_PROVIDER = 'claude'
    } else {
      process.env.AI_PROVIDER = 'openai'
    }
    console.log(`FailoverService: Switched AI provider to ${target.name}`)
  }

  /**
   * Perform failback to primary service
   */
  private static async performFailback(serviceName: string, primaryEndpoint: ServiceEndpoint): Promise<void> {
    console.log(`FailoverService: Performing failback to primary ${primaryEndpoint.name}`)
    
    // Implement failback logic based on service type
    switch (serviceName) {
      case 'database':
        process.env.DATABASE_URL = primaryEndpoint.url
        break
      case 'redis-cache':
        process.env.REDIS_URL = primaryEndpoint.url
        break
    }
  }

  /**
   * Start system health monitoring
   */
  private static startSystemHealthMonitoring(): void {
    setInterval(async () => {
      await this.collectSystemHealthMetrics()
    }, 60000) // Every minute
  }

  /**
   * Collect system health metrics
   */
  private static async collectSystemHealthMetrics(): Promise<void> {
    try {
      // Database health
      const dbStartTime = Date.now()
      await prisma.$queryRaw`SELECT 1`
      const dbResponseTime = Date.now() - dbStartTime
      
      await this.updateSystemHealth('database', 'primary', true, dbResponseTime)

      // Additional metrics would be collected here for other services
      
    } catch (error) {
      console.error('FailoverService: Error collecting system health metrics:', error)
    }
  }

  /**
   * Update system health metrics in database
   */
  private static async updateSystemHealth(
    serviceName: string,
    endpoint: ServiceEndpoint,
    isHealthy: boolean,
    responseTime: number
  ): Promise<void> {
    try {
      await prisma.systemHealth.upsert({
        where: {
          id: `${serviceName}-${endpoint.name}`
        },
        update: {
          status: isHealthy ? 'healthy' : 'unhealthy',
          responseTime,
          lastCheck: new Date(),
          errorRate: endpoint.errorCount > 0 ? (endpoint.errorCount / 10) * 100 : 0 // Last 10 checks
        },
        create: {
          id: `${serviceName}-${endpoint.name}`,
          serviceType: serviceName,
          serviceName: endpoint.name,
          status: isHealthy ? 'healthy' : 'unhealthy',
          responseTime,
          lastCheck: new Date(),
          errorRate: 0
        }
      })
    } catch (error) {
      console.error('FailoverService: Error updating system health:', error)
    }
  }

  /**
   * Log failover event
   */
  private static async logFailoverEvent(event: {
    serviceType: string
    serviceName: string
    eventType: string
    severity: string
    description: string
    metadata?: any
    resolved?: boolean
    resolvedAt?: Date
  }): Promise<void> {
    try {
      await prisma.failoverEvent.create({
        data: {
          serviceType: event.serviceType,
          serviceName: event.serviceName,
          eventType: event.eventType,
          severity: event.severity,
          description: event.description,
          metadata: event.metadata,
          resolved: event.resolved || false,
          resolvedAt: event.resolvedAt
        }
      })
    } catch (error) {
      console.error('FailoverService: Error logging failover event:', error)
    }
  }

  /**
   * Send failover notifications
   */
  private static async sendFailoverNotifications(
    serviceName: string,
    failed: ServiceEndpoint,
    target: ServiceEndpoint
  ): Promise<void> {
    const config = this.serviceConfigurations.get(serviceName)
    if (!config) return

    const message = `🚨 Failover Alert: ${failed.name} has failed. Traffic switched to ${target.name}.`
    
    // Send email notifications
    for (const email of config.notifications.email) {
      console.log(`FailoverService: Sending failover notification to ${email}`)
      // Email sending logic would go here
    }
  }

  /**
   * Send critical alert
   */
  private static async sendCriticalAlert(serviceName: string): Promise<void> {
    const message = `🚨 CRITICAL ALERT: All endpoints failed for ${serviceName}. Service is unavailable.`
    console.error(message)
    
    // Send to all configured notification channels
    // Implementation would include email, Slack, PagerDuty, etc.
  }

  /**
   * Get current system status
   */
  static async getSystemStatus(): Promise<{
    services: Array<{
      name: string
      status: string
      activeEndpoint: string
      lastFailover?: Date
      uptime: number
    }>
    recentEvents: any[]
    overallHealth: 'healthy' | 'degraded' | 'critical'
  }> {
    try {
      const services = []
      let overallHealth: 'healthy' | 'degraded' | 'critical' = 'healthy'

      for (const [serviceName, config] of this.serviceConfigurations.entries()) {
        const activeEndpoint = config.endpoints.find(e => e.status === 'active')
        const hasFailures = config.endpoints.some(e => e.status === 'failed')

        if (!activeEndpoint) {
          overallHealth = 'critical'
        } else if (hasFailures && overallHealth !== 'critical') {
          overallHealth = 'degraded'
        }

        services.push({
          name: serviceName,
          status: activeEndpoint ? 'operational' : 'down',
          activeEndpoint: activeEndpoint?.name || 'none',
          uptime: 99.9 // This would be calculated from actual data
        })
      }

      // Get recent failover events
      const recentEvents = await prisma.failoverEvent.findMany({
        take: 10,
        orderBy: { detectedAt: 'desc' }
      })

      return {
        services,
        recentEvents,
        overallHealth
      }
    } catch (error) {
      console.error('FailoverService: Error getting system status:', error)
      return {
        services: [],
        recentEvents: [],
        overallHealth: 'critical'
      }
    }
  }

  /**
   * Cleanup old failover events and health metrics
   */
  static async cleanup(): Promise<void> {
    try {
      const retentionDays = 30
      const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000)

      // Delete old failover events
      await prisma.failoverEvent.deleteMany({
        where: {
          detectedAt: {
            lt: cutoffDate
          }
        }
      })

      // Delete old system health records
      await prisma.systemHealth.deleteMany({
        where: {
          lastCheck: {
            lt: cutoffDate
          }
        }
      })

      console.log('FailoverService: Cleanup completed')
    } catch (error) {
      console.error('FailoverService: Cleanup failed:', error)
    }
  }

  /**
   * Shutdown failover service
   */
  static shutdown(): void {
    // Clear all health check intervals
    for (const [serviceName, interval] of this.healthCheckIntervals.entries()) {
      clearInterval(interval)
      console.log(`FailoverService: Stopped monitoring for ${serviceName}`)
    }
    
    this.healthCheckIntervals.clear()
    this.serviceConfigurations.clear()
    
    console.log('FailoverService: Shutdown completed')
  }
}

// Initialize on module load
FailoverService.initialize()