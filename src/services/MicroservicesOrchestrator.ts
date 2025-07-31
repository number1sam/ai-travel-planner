import { prisma } from '@/lib/prisma'
import { BackupService } from './BackupService'
import { FailoverService } from './FailoverService'
import { NotificationService } from './NotificationService'
import { AIOrchestrationService } from './AIOrchestrationService'
import { HealthCompanionService } from './HealthCompanionService'
import Redis from 'ioredis'
import { EventEmitter } from 'events'
import crypto from 'crypto'

export interface ServiceDefinition {
  id: string
  name: string
  type: 'core' | 'bot' | 'external' | 'support'
  endpoint: string
  healthCheck: string
  dependencies: string[]
  priority: number
  resources: {
    cpu: number // CPU cores
    memory: number // MB
    maxInstances: number
    minInstances: number
  }
  scalingPolicy: {
    metric: 'cpu' | 'memory' | 'requests' | 'custom'
    targetValue: number
    scaleUpThreshold: number
    scaleDownThreshold: number
    cooldownPeriod: number // seconds
  }
  circuitBreaker: {
    enabled: boolean
    threshold: number // failure percentage
    timeout: number // milliseconds
    resetTimeout: number // milliseconds
  }
}

export interface ServiceInstance {
  id: string
  serviceId: string
  status: 'starting' | 'healthy' | 'unhealthy' | 'stopping' | 'stopped'
  startedAt: Date
  lastHealthCheck: Date
  metrics: {
    cpu: number
    memory: number
    requestsPerSecond: number
    averageResponseTime: number
    errorRate: number
  }
  metadata: any
}

export interface ServiceRequest {
  id: string
  serviceId: string
  method: string
  params: any
  priority: 'low' | 'normal' | 'high' | 'critical'
  timeout: number
  retries: number
  circuitBreakerOpen: boolean
  startTime: Date
  endTime?: Date
  status: 'pending' | 'processing' | 'completed' | 'failed'
  result?: any
  error?: string
}

export interface OrchestrationEvent {
  type: 'service_started' | 'service_stopped' | 'service_scaled' | 'request_completed' | 'circuit_breaker_open' | 'health_check_failed'
  serviceId: string
  instanceId?: string
  timestamp: Date
  data: any
}

export class MicroservicesOrchestrator extends EventEmitter {
  private static instance: MicroservicesOrchestrator
  private services: Map<string, ServiceDefinition> = new Map()
  private instances: Map<string, ServiceInstance[]> = new Map()
  private circuitBreakers: Map<string, any> = new Map()
  private redis: Redis
  private requestQueue: Map<string, ServiceRequest[]> = new Map()
  private metrics: Map<string, any> = new Map()
  
  // Service definitions
  private static readonly SERVICE_DEFINITIONS: ServiceDefinition[] = [
    // Core Services
    {
      id: 'api-gateway',
      name: 'API Gateway',
      type: 'core',
      endpoint: process.env.API_GATEWAY_URL || 'http://localhost:3000',
      healthCheck: '/health',
      dependencies: [],
      priority: 1,
      resources: {
        cpu: 2,
        memory: 2048,
        maxInstances: 10,
        minInstances: 2
      },
      scalingPolicy: {
        metric: 'cpu',
        targetValue: 70,
        scaleUpThreshold: 80,
        scaleDownThreshold: 30,
        cooldownPeriod: 300
      },
      circuitBreaker: {
        enabled: true,
        threshold: 50,
        timeout: 5000,
        resetTimeout: 30000
      }
    },
    {
      id: 'auth-service',
      name: 'Authentication Service',
      type: 'core',
      endpoint: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
      healthCheck: '/health',
      dependencies: ['database-service'],
      priority: 1,
      resources: {
        cpu: 1,
        memory: 1024,
        maxInstances: 5,
        minInstances: 2
      },
      scalingPolicy: {
        metric: 'requests',
        targetValue: 1000,
        scaleUpThreshold: 1200,
        scaleDownThreshold: 500,
        cooldownPeriod: 180
      },
      circuitBreaker: {
        enabled: true,
        threshold: 30,
        timeout: 3000,
        resetTimeout: 20000
      }
    },
    {
      id: 'database-service',
      name: 'Database Service',
      type: 'core',
      endpoint: process.env.DATABASE_URL || 'postgresql://localhost:5432',
      healthCheck: '/health',
      dependencies: [],
      priority: 0,
      resources: {
        cpu: 4,
        memory: 8192,
        maxInstances: 3,
        minInstances: 1
      },
      scalingPolicy: {
        metric: 'custom',
        targetValue: 80,
        scaleUpThreshold: 90,
        scaleDownThreshold: 40,
        cooldownPeriod: 600
      },
      circuitBreaker: {
        enabled: false,
        threshold: 0,
        timeout: 30000,
        resetTimeout: 0
      }
    },
    // Bot Services
    {
      id: 'flight-bot',
      name: 'Flight Bot Service',
      type: 'bot',
      endpoint: process.env.FLIGHT_BOT_URL || 'http://localhost:3010',
      healthCheck: '/health',
      dependencies: ['ai-orchestration', 'cache-service'],
      priority: 2,
      resources: {
        cpu: 2,
        memory: 2048,
        maxInstances: 5,
        minInstances: 1
      },
      scalingPolicy: {
        metric: 'requests',
        targetValue: 500,
        scaleUpThreshold: 600,
        scaleDownThreshold: 200,
        cooldownPeriod: 300
      },
      circuitBreaker: {
        enabled: true,
        threshold: 40,
        timeout: 30000,
        resetTimeout: 60000
      }
    },
    {
      id: 'hotel-bot',
      name: 'Hotel Bot Service',
      type: 'bot',
      endpoint: process.env.HOTEL_BOT_URL || 'http://localhost:3011',
      healthCheck: '/health',
      dependencies: ['ai-orchestration', 'cache-service'],
      priority: 2,
      resources: {
        cpu: 2,
        memory: 2048,
        maxInstances: 5,
        minInstances: 1
      },
      scalingPolicy: {
        metric: 'requests',
        targetValue: 500,
        scaleUpThreshold: 600,
        scaleDownThreshold: 200,
        cooldownPeriod: 300
      },
      circuitBreaker: {
        enabled: true,
        threshold: 40,
        timeout: 25000,
        resetTimeout: 60000
      }
    },
    {
      id: 'activity-bot',
      name: 'Activity Bot Service',
      type: 'bot',
      endpoint: process.env.ACTIVITY_BOT_URL || 'http://localhost:3012',
      healthCheck: '/health',
      dependencies: ['ai-orchestration', 'cache-service'],
      priority: 2,
      resources: {
        cpu: 2,
        memory: 2048,
        maxInstances: 8,
        minInstances: 2
      },
      scalingPolicy: {
        metric: 'requests',
        targetValue: 800,
        scaleUpThreshold: 1000,
        scaleDownThreshold: 400,
        cooldownPeriod: 240
      },
      circuitBreaker: {
        enabled: true,
        threshold: 35,
        timeout: 20000,
        resetTimeout: 45000
      }
    },
    // Support Services
    {
      id: 'cache-service',
      name: 'Redis Cache Service',
      type: 'support',
      endpoint: process.env.REDIS_URL || 'redis://localhost:6379',
      healthCheck: '/ping',
      dependencies: [],
      priority: 1,
      resources: {
        cpu: 2,
        memory: 4096,
        maxInstances: 3,
        minInstances: 1
      },
      scalingPolicy: {
        metric: 'memory',
        targetValue: 75,
        scaleUpThreshold: 85,
        scaleDownThreshold: 50,
        cooldownPeriod: 300
      },
      circuitBreaker: {
        enabled: false,
        threshold: 0,
        timeout: 5000,
        resetTimeout: 0
      }
    },
    {
      id: 'ai-orchestration',
      name: 'AI Orchestration Service',
      type: 'core',
      endpoint: process.env.AI_ORCHESTRATION_URL || 'http://localhost:3020',
      healthCheck: '/health',
      dependencies: ['cache-service'],
      priority: 2,
      resources: {
        cpu: 4,
        memory: 4096,
        maxInstances: 5,
        minInstances: 2
      },
      scalingPolicy: {
        metric: 'cpu',
        targetValue: 60,
        scaleUpThreshold: 75,
        scaleDownThreshold: 30,
        cooldownPeriod: 300
      },
      circuitBreaker: {
        enabled: true,
        threshold: 25,
        timeout: 60000,
        resetTimeout: 120000
      }
    },
    {
      id: 'notification-service',
      name: 'Notification Service',
      type: 'support',
      endpoint: process.env.NOTIFICATION_URL || 'http://localhost:3030',
      healthCheck: '/health',
      dependencies: ['database-service'],
      priority: 3,
      resources: {
        cpu: 1,
        memory: 1024,
        maxInstances: 5,
        minInstances: 1
      },
      scalingPolicy: {
        metric: 'requests',
        targetValue: 2000,
        scaleUpThreshold: 2500,
        scaleDownThreshold: 1000,
        cooldownPeriod: 180
      },
      circuitBreaker: {
        enabled: true,
        threshold: 60,
        timeout: 10000,
        resetTimeout: 30000
      }
    },
    {
      id: 'health-companion',
      name: 'Health Companion Service',
      type: 'core',
      endpoint: process.env.HEALTH_SERVICE_URL || 'http://localhost:3040',
      healthCheck: '/health',
      dependencies: ['database-service', 'ai-orchestration'],
      priority: 2,
      resources: {
        cpu: 2,
        memory: 2048,
        maxInstances: 3,
        minInstances: 1
      },
      scalingPolicy: {
        metric: 'cpu',
        targetValue: 65,
        scaleUpThreshold: 80,
        scaleDownThreshold: 35,
        cooldownPeriod: 300
      },
      circuitBreaker: {
        enabled: true,
        threshold: 45,
        timeout: 15000,
        resetTimeout: 45000
      }
    }
  ]

  private constructor() {
    super()
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      retryStrategy: (times) => Math.min(times * 50, 2000)
    })
    
    this.initialize()
  }

  static getInstance(): MicroservicesOrchestrator {
    if (!this.instance) {
      this.instance = new MicroservicesOrchestrator()
    }
    return this.instance
  }

  /**
   * Initialize orchestrator
   */
  private async initialize(): Promise<void> {
    console.log('MicroservicesOrchestrator: Initializing...')

    // Register service definitions
    for (const serviceDef of MicroservicesOrchestrator.SERVICE_DEFINITIONS) {
      this.services.set(serviceDef.id, serviceDef)
      this.instances.set(serviceDef.id, [])
      this.requestQueue.set(serviceDef.id, [])
      this.metrics.set(serviceDef.id, {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        lastHourRequests: [],
        healthChecks: {
          total: 0,
          failed: 0
        }
      })
    }

    // Start core services first
    await this.startCoreServices()

    // Start monitoring
    this.startHealthChecking()
    this.startMetricsCollection()
    this.startAutoScaling()
    this.startRequestProcessing()

    // Subscribe to Redis events
    await this.subscribeToEvents()

    console.log('MicroservicesOrchestrator: Initialized successfully')
  }

  /**
   * Start core services
   */
  private async startCoreServices(): Promise<void> {
    const coreServices = Array.from(this.services.values())
      .filter(s => s.type === 'core')
      .sort((a, b) => a.priority - b.priority)

    for (const service of coreServices) {
      try {
        await this.startService(service.id)
      } catch (error) {
        console.error(`MicroservicesOrchestrator: Failed to start core service ${service.id}:`, error)
      }
    }
  }

  /**
   * Start a service
   */
  async startService(serviceId: string): Promise<ServiceInstance> {
    const service = this.services.get(serviceId)
    if (!service) {
      throw new Error(`Service ${serviceId} not found`)
    }

    console.log(`MicroservicesOrchestrator: Starting service ${serviceId}`)

    // Check dependencies
    for (const depId of service.dependencies) {
      const depInstances = this.instances.get(depId) || []
      if (depInstances.filter(i => i.status === 'healthy').length === 0) {
        throw new Error(`Dependency ${depId} is not healthy`)
      }
    }

    // Create instance
    const instance: ServiceInstance = {
      id: `${serviceId}-${crypto.randomBytes(4).toString('hex')}`,
      serviceId,
      status: 'starting',
      startedAt: new Date(),
      lastHealthCheck: new Date(),
      metrics: {
        cpu: 0,
        memory: 0,
        requestsPerSecond: 0,
        averageResponseTime: 0,
        errorRate: 0
      },
      metadata: {}
    }

    // Add to instances
    const instances = this.instances.get(serviceId) || []
    instances.push(instance)
    this.instances.set(serviceId, instances)

    // Simulate service startup
    setTimeout(() => {
      instance.status = 'healthy'
      this.emit('service_started', {
        type: 'service_started',
        serviceId,
        instanceId: instance.id,
        timestamp: new Date(),
        data: { instance }
      })
    }, 2000)

    // Initialize circuit breaker
    this.initializeCircuitBreaker(serviceId)

    // Publish event
    await this.publishEvent('service_started', { serviceId, instanceId: instance.id })

    return instance
  }

  /**
   * Stop a service instance
   */
  async stopServiceInstance(serviceId: string, instanceId: string): Promise<void> {
    console.log(`MicroservicesOrchestrator: Stopping instance ${instanceId} of service ${serviceId}`)

    const instances = this.instances.get(serviceId) || []
    const instance = instances.find(i => i.id === instanceId)

    if (!instance) {
      throw new Error(`Instance ${instanceId} not found`)
    }

    instance.status = 'stopping'

    // Drain requests
    await this.drainInstanceRequests(instanceId)

    // Remove from load balancer
    instances.splice(instances.indexOf(instance), 1)
    this.instances.set(serviceId, instances)

    // Publish event
    await this.publishEvent('service_stopped', { serviceId, instanceId })

    this.emit('service_stopped', {
      type: 'service_stopped',
      serviceId,
      instanceId,
      timestamp: new Date(),
      data: { instance }
    })
  }

  /**
   * Route request to service
   */
  async routeRequest(request: Omit<ServiceRequest, 'id' | 'startTime' | 'status'>): Promise<any> {
    const requestId = crypto.randomUUID()
    const fullRequest: ServiceRequest = {
      ...request,
      id: requestId,
      startTime: new Date(),
      status: 'pending'
    }

    // Check circuit breaker
    const circuitBreaker = this.circuitBreakers.get(request.serviceId)
    if (circuitBreaker && circuitBreaker.isOpen()) {
      fullRequest.circuitBreakerOpen = true
      fullRequest.status = 'failed'
      fullRequest.error = 'Circuit breaker is open'
      throw new Error('Service unavailable - circuit breaker open')
    }

    // Get healthy instances
    const instances = this.getHealthyInstances(request.serviceId)
    if (instances.length === 0) {
      fullRequest.status = 'failed'
      fullRequest.error = 'No healthy instances available'
      throw new Error(`No healthy instances for service ${request.serviceId}`)
    }

    // Apply load balancing
    const instance = this.selectInstance(instances, request)

    try {
      // Add to queue if high load
      if (this.shouldQueue(request.serviceId, instance)) {
        return await this.queueRequest(fullRequest)
      }

      // Execute request
      const result = await this.executeRequest(fullRequest, instance)
      
      // Update metrics
      this.updateRequestMetrics(request.serviceId, fullRequest, true)
      
      return result
    } catch (error) {
      // Update metrics
      this.updateRequestMetrics(request.serviceId, fullRequest, false)
      
      // Trip circuit breaker if needed
      if (circuitBreaker) {
        circuitBreaker.recordFailure()
      }

      // Retry if possible
      if (fullRequest.retries > 0) {
        fullRequest.retries--
        return this.routeRequest(fullRequest)
      }

      throw error
    }
  }

  /**
   * Execute request on instance
   */
  private async executeRequest(request: ServiceRequest, instance: ServiceInstance): Promise<any> {
    const service = this.services.get(request.serviceId)
    if (!service) {
      throw new Error(`Service ${request.serviceId} not found`)
    }

    request.status = 'processing'

    // Simulate request execution based on service type
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        request.status = 'failed'
        request.error = 'Request timeout'
        reject(new Error('Request timeout'))
      }, request.timeout)

      // Simulate processing time
      setTimeout(() => {
        clearTimeout(timeout)
        
        // Simulate random failures (10% failure rate for testing)
        if (Math.random() < 0.1) {
          request.status = 'failed'
          request.error = 'Random failure for testing'
          reject(new Error('Service error'))
          return
        }

        request.status = 'completed'
        request.endTime = new Date()

        // Return mock response based on service
        const response = this.generateMockResponse(request.serviceId, request.method, request.params)
        request.result = response
        
        resolve(response)
      }, Math.random() * 1000 + 500) // 500-1500ms processing time
    })
  }

  /**
   * Initialize circuit breaker for service
   */
  private initializeCircuitBreaker(serviceId: string): void {
    const service = this.services.get(serviceId)
    if (!service || !service.circuitBreaker.enabled) return

    const circuitBreaker = {
      failures: 0,
      successes: 0,
      state: 'closed', // closed, open, half-open
      lastFailureTime: null as Date | null,
      nextAttemptTime: null as Date | null,
      
      isOpen(): boolean {
        if (this.state === 'open' && this.nextAttemptTime && new Date() > this.nextAttemptTime) {
          this.state = 'half-open'
        }
        return this.state === 'open'
      },
      
      recordSuccess(): void {
        this.failures = 0
        this.successes++
        if (this.state === 'half-open') {
          this.state = 'closed'
        }
      },
      
      recordFailure(): void {
        this.failures++
        this.lastFailureTime = new Date()
        
        const failureRate = this.failures / (this.failures + this.successes) * 100
        if (failureRate >= service.circuitBreaker.threshold) {
          this.state = 'open'
          this.nextAttemptTime = new Date(Date.now() + service.circuitBreaker.resetTimeout)
          
          // Emit event
          MicroservicesOrchestrator.getInstance().emit('circuit_breaker_open', {
            type: 'circuit_breaker_open',
            serviceId,
            timestamp: new Date(),
            data: { failureRate, failures: this.failures }
          })
        }
      }
    }

    this.circuitBreakers.set(serviceId, circuitBreaker)
  }

  /**
   * Get healthy instances for a service
   */
  private getHealthyInstances(serviceId: string): ServiceInstance[] {
    const instances = this.instances.get(serviceId) || []
    return instances.filter(i => i.status === 'healthy')
  }

  /**
   * Select instance using load balancing
   */
  private selectInstance(instances: ServiceInstance[], request: ServiceRequest): ServiceInstance {
    // Simple round-robin for now
    // Could implement more sophisticated algorithms (least connections, weighted, etc.)
    const index = Math.floor(Math.random() * instances.length)
    return instances[index]
  }

  /**
   * Check if request should be queued
   */
  private shouldQueue(serviceId: string, instance: ServiceInstance): boolean {
    // Queue if instance is under high load
    return instance.metrics.cpu > 80 || instance.metrics.requestsPerSecond > 100
  }

  /**
   * Queue request for later processing
   */
  private async queueRequest(request: ServiceRequest): Promise<any> {
    const queue = this.requestQueue.get(request.serviceId) || []
    queue.push(request)
    this.requestQueue.set(request.serviceId, queue)

    // Store in Redis for persistence
    await this.redis.lpush(
      `queue:${request.serviceId}`,
      JSON.stringify(request)
    )

    return new Promise((resolve, reject) => {
      // Set up listener for completion
      const checkCompletion = setInterval(() => {
        if (request.status === 'completed') {
          clearInterval(checkCompletion)
          resolve(request.result)
        } else if (request.status === 'failed') {
          clearInterval(checkCompletion)
          reject(new Error(request.error || 'Request failed'))
        }
      }, 100)

      // Timeout
      setTimeout(() => {
        clearInterval(checkCompletion)
        reject(new Error('Queue timeout'))
      }, request.timeout)
    })
  }

  /**
   * Update request metrics
   */
  private updateRequestMetrics(serviceId: string, request: ServiceRequest, success: boolean): void {
    const metrics = this.metrics.get(serviceId)
    if (!metrics) return

    metrics.totalRequests++
    if (success) {
      metrics.successfulRequests++
    } else {
      metrics.failedRequests++
    }

    // Calculate response time
    if (request.endTime) {
      const responseTime = request.endTime.getTime() - request.startTime.getTime()
      metrics.averageResponseTime = (metrics.averageResponseTime * (metrics.totalRequests - 1) + responseTime) / metrics.totalRequests
    }

    // Track last hour requests
    metrics.lastHourRequests.push({
      timestamp: new Date(),
      success,
      responseTime: request.endTime ? request.endTime.getTime() - request.startTime.getTime() : 0
    })

    // Clean old entries
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    metrics.lastHourRequests = metrics.lastHourRequests.filter((r: any) => r.timestamp > oneHourAgo)

    this.metrics.set(serviceId, metrics)
  }

  /**
   * Generate mock response based on service
   */
  private generateMockResponse(serviceId: string, method: string, params: any): any {
    switch (serviceId) {
      case 'flight-bot':
        return {
          flights: [
            { id: 'FL123', airline: 'British Airways', price: 450, departure: '10:00', arrival: '14:00' },
            { id: 'FL456', airline: 'Emirates', price: 580, departure: '22:00', arrival: '11:00+1' }
          ]
        }
      
      case 'hotel-bot':
        return {
          hotels: [
            { id: 'H001', name: 'Grand Plaza', rating: 4.5, price: 120, location: 'City Center' },
            { id: 'H002', name: 'Beach Resort', rating: 4.8, price: 180, location: 'Beachfront' }
          ]
        }
      
      case 'activity-bot':
        return {
          activities: [
            { id: 'A001', name: 'City Tour', duration: 180, price: 35, type: 'sightseeing' },
            { id: 'A002', name: 'Museum Visit', duration: 120, price: 15, type: 'cultural' }
          ]
        }
      
      default:
        return { success: true, data: params }
    }
  }

  /**
   * Start health checking
   */
  private startHealthChecking(): void {
    setInterval(async () => {
      for (const [serviceId, instances] of this.instances.entries()) {
        for (const instance of instances) {
          await this.checkInstanceHealth(serviceId, instance)
        }
      }
    }, 30000) // Every 30 seconds
  }

  /**
   * Check instance health
   */
  private async checkInstanceHealth(serviceId: string, instance: ServiceInstance): Promise<void> {
    const service = this.services.get(serviceId)
    if (!service) return

    const metrics = this.metrics.get(serviceId)
    if (metrics) {
      metrics.healthChecks.total++
    }

    try {
      // Simulate health check
      const healthy = Math.random() > 0.05 // 95% success rate

      if (healthy) {
        instance.status = 'healthy'
        instance.lastHealthCheck = new Date()
        
        // Update metrics
        instance.metrics = {
          cpu: Math.random() * 100,
          memory: Math.random() * 100,
          requestsPerSecond: Math.random() * 50,
          averageResponseTime: Math.random() * 1000,
          errorRate: Math.random() * 5
        }
      } else {
        instance.status = 'unhealthy'
        if (metrics) {
          metrics.healthChecks.failed++
        }
        
        this.emit('health_check_failed', {
          type: 'health_check_failed',
          serviceId,
          instanceId: instance.id,
          timestamp: new Date(),
          data: { instance }
        })
      }
    } catch (error) {
      instance.status = 'unhealthy'
      console.error(`MicroservicesOrchestrator: Health check failed for ${instance.id}:`, error)
    }
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    setInterval(async () => {
      const allMetrics: any = {}

      for (const [serviceId, metrics] of this.metrics.entries()) {
        const instances = this.instances.get(serviceId) || []
        const healthyInstances = instances.filter(i => i.status === 'healthy')

        allMetrics[serviceId] = {
          ...metrics,
          instances: {
            total: instances.length,
            healthy: healthyInstances.length,
            unhealthy: instances.length - healthyInstances.length
          },
          aggregateMetrics: this.calculateAggregateMetrics(healthyInstances)
        }
      }

      // Store in Redis
      await this.redis.set(
        'orchestrator:metrics',
        JSON.stringify(allMetrics),
        'EX',
        300 // 5 minutes
      )
    }, 60000) // Every minute
  }

  /**
   * Calculate aggregate metrics for instances
   */
  private calculateAggregateMetrics(instances: ServiceInstance[]): any {
    if (instances.length === 0) {
      return {
        avgCpu: 0,
        avgMemory: 0,
        totalRequestsPerSecond: 0,
        avgResponseTime: 0,
        avgErrorRate: 0
      }
    }

    const totals = instances.reduce((acc, instance) => ({
      cpu: acc.cpu + instance.metrics.cpu,
      memory: acc.memory + instance.metrics.memory,
      rps: acc.rps + instance.metrics.requestsPerSecond,
      responseTime: acc.responseTime + instance.metrics.averageResponseTime,
      errorRate: acc.errorRate + instance.metrics.errorRate
    }), { cpu: 0, memory: 0, rps: 0, responseTime: 0, errorRate: 0 })

    return {
      avgCpu: totals.cpu / instances.length,
      avgMemory: totals.memory / instances.length,
      totalRequestsPerSecond: totals.rps,
      avgResponseTime: totals.responseTime / instances.length,
      avgErrorRate: totals.errorRate / instances.length
    }
  }

  /**
   * Start auto-scaling
   */
  private startAutoScaling(): void {
    setInterval(async () => {
      for (const [serviceId, service] of this.services.entries()) {
        await this.checkScaling(serviceId, service)
      }
    }, 60000) // Every minute
  }

  /**
   * Check if service needs scaling
   */
  private async checkScaling(serviceId: string, service: ServiceDefinition): Promise<void> {
    const instances = this.instances.get(serviceId) || []
    const healthyInstances = instances.filter(i => i.status === 'healthy')
    
    if (healthyInstances.length === 0) return

    const aggregateMetrics = this.calculateAggregateMetrics(healthyInstances)
    const metric = service.scalingPolicy.metric
    let currentValue = 0

    switch (metric) {
      case 'cpu':
        currentValue = aggregateMetrics.avgCpu
        break
      case 'memory':
        currentValue = aggregateMetrics.avgMemory
        break
      case 'requests':
        currentValue = aggregateMetrics.totalRequestsPerSecond
        break
    }

    // Scale up
    if (currentValue > service.scalingPolicy.scaleUpThreshold && instances.length < service.resources.maxInstances) {
      console.log(`MicroservicesOrchestrator: Scaling up ${serviceId} (${metric}: ${currentValue})`)
      await this.scaleUp(serviceId)
    }
    // Scale down
    else if (currentValue < service.scalingPolicy.scaleDownThreshold && instances.length > service.resources.minInstances) {
      console.log(`MicroservicesOrchestrator: Scaling down ${serviceId} (${metric}: ${currentValue})`)
      await this.scaleDown(serviceId)
    }
  }

  /**
   * Scale up service
   */
  private async scaleUp(serviceId: string): Promise<void> {
    try {
      const instance = await this.startService(serviceId)
      
      this.emit('service_scaled', {
        type: 'service_scaled',
        serviceId,
        timestamp: new Date(),
        data: { 
          action: 'scale_up',
          newInstance: instance,
          totalInstances: (this.instances.get(serviceId) || []).length
        }
      })

      await this.publishEvent('service_scaled', { serviceId, action: 'scale_up' })
    } catch (error) {
      console.error(`MicroservicesOrchestrator: Failed to scale up ${serviceId}:`, error)
    }
  }

  /**
   * Scale down service
   */
  private async scaleDown(serviceId: string): Promise<void> {
    const instances = this.instances.get(serviceId) || []
    const healthyInstances = instances.filter(i => i.status === 'healthy')
    
    if (healthyInstances.length === 0) return

    // Select instance with lowest load
    const instanceToStop = healthyInstances.reduce((min, instance) => 
      instance.metrics.requestsPerSecond < min.metrics.requestsPerSecond ? instance : min
    )

    try {
      await this.stopServiceInstance(serviceId, instanceToStop.id)
      
      this.emit('service_scaled', {
        type: 'service_scaled',
        serviceId,
        timestamp: new Date(),
        data: {
          action: 'scale_down',
          removedInstance: instanceToStop,
          totalInstances: (this.instances.get(serviceId) || []).length
        }
      })

      await this.publishEvent('service_scaled', { serviceId, action: 'scale_down' })
    } catch (error) {
      console.error(`MicroservicesOrchestrator: Failed to scale down ${serviceId}:`, error)
    }
  }

  /**
   * Start request processing from queues
   */
  private startRequestProcessing(): void {
    setInterval(async () => {
      for (const [serviceId, queue] of this.requestQueue.entries()) {
        if (queue.length === 0) continue

        const instances = this.getHealthyInstances(serviceId)
        if (instances.length === 0) continue

        // Process queued requests
        const toProcess = Math.min(queue.length, instances.length * 10)
        for (let i = 0; i < toProcess; i++) {
          const request = queue.shift()
          if (!request) break

          try {
            const instance = this.selectInstance(instances, request)
            await this.executeRequest(request, instance)
          } catch (error) {
            request.status = 'failed'
            request.error = error.message
          }
        }

        this.requestQueue.set(serviceId, queue)
      }
    }, 1000) // Every second
  }

  /**
   * Drain requests from instance
   */
  private async drainInstanceRequests(instanceId: string): Promise<void> {
    // Wait for in-flight requests to complete
    await new Promise(resolve => setTimeout(resolve, 5000))
  }

  /**
   * Subscribe to Redis events
   */
  private async subscribeToEvents(): Promise<void> {
    const subscriber = new Redis()
    
    subscriber.on('message', (channel, message) => {
      try {
        const event = JSON.parse(message)
        this.handleExternalEvent(event)
      } catch (error) {
        console.error('MicroservicesOrchestrator: Error handling event:', error)
      }
    })

    await subscriber.subscribe('orchestrator:events')
  }

  /**
   * Handle external events
   */
  private handleExternalEvent(event: any): void {
    // Handle events from other services
    console.log('MicroservicesOrchestrator: Received external event:', event.type)
  }

  /**
   * Publish event to Redis
   */
  private async publishEvent(type: string, data: any): Promise<void> {
    const event = {
      type,
      timestamp: new Date(),
      data
    }

    await this.redis.publish('orchestrator:events', JSON.stringify(event))
  }

  /**
   * Get orchestrator status
   */
  getStatus(): any {
    const status: any = {
      services: {},
      totalInstances: 0,
      healthyInstances: 0,
      metrics: {}
    }

    for (const [serviceId, service] of this.services.entries()) {
      const instances = this.instances.get(serviceId) || []
      const healthyInstances = instances.filter(i => i.status === 'healthy')
      const metrics = this.metrics.get(serviceId)

      status.services[serviceId] = {
        name: service.name,
        type: service.type,
        instances: {
          total: instances.length,
          healthy: healthyInstances.length,
          unhealthy: instances.length - healthyInstances.length
        },
        circuitBreaker: this.circuitBreakers.get(serviceId)?.state || 'closed',
        metrics: metrics ? {
          totalRequests: metrics.totalRequests,
          successRate: metrics.totalRequests > 0 ? 
            (metrics.successfulRequests / metrics.totalRequests * 100).toFixed(2) + '%' : '0%',
          averageResponseTime: Math.round(metrics.averageResponseTime) + 'ms',
          requestsPerHour: metrics.lastHourRequests.length
        } : null
      }

      status.totalInstances += instances.length
      status.healthyInstances += healthyInstances.length
    }

    status.overallHealth = status.totalInstances > 0 ? 
      (status.healthyInstances / status.totalInstances * 100).toFixed(2) + '%' : '0%'

    return status
  }

  /**
   * Shutdown orchestrator
   */
  async shutdown(): Promise<void> {
    console.log('MicroservicesOrchestrator: Shutting down...')

    // Stop all services
    for (const [serviceId, instances] of this.instances.entries()) {
      for (const instance of [...instances]) {
        await this.stopServiceInstance(serviceId, instance.id)
      }
    }

    // Close Redis connections
    await this.redis.quit()

    console.log('MicroservicesOrchestrator: Shutdown complete')
  }
}

// Export singleton instance
export const orchestrator = MicroservicesOrchestrator.getInstance()