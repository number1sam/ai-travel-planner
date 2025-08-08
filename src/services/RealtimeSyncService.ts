import EventEmitter from 'events'
import { Server as SocketIOServer } from 'socket.io'
// import { createAdapter } from '@socket.io/redis-adapter' // Disabled for development
import { Redis } from 'ioredis'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'

interface SyncChannel {
  name: string
  subscribers: Set<string>
  lastActivity: Date
  dataVersion: number
}

interface SyncEvent {
  id: string
  channel: string
  type: 'create' | 'update' | 'delete' | 'batch'
  entity: string
  data: any
  userId: string
  timestamp: Date
  version: number
}

interface CacheStrategy {
  ttl: number
  invalidationRules: InvalidationRule[]
  compressionEnabled: boolean
  distributedCache: boolean
}

interface InvalidationRule {
  event: string
  pattern: string
  action: 'delete' | 'refresh' | 'update'
}

interface CacheMetrics {
  hits: number
  misses: number
  evictions: number
  size: number
  hitRate: number
}

export class RealtimeSyncService extends EventEmitter {
  private io: SocketIOServer | null = null
  private pubClient: Redis
  private subClient: Redis
  private channels: Map<string, SyncChannel>
  private eventQueue: SyncEvent[]
  private cacheStrategies: Map<string, CacheStrategy>
  private cacheMetrics: Map<string, CacheMetrics>
  private syncLocks: Map<string, boolean>

  constructor() {
    super()
    this.pubClient = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD
    })
    this.subClient = this.pubClient.duplicate()
    this.channels = new Map()
    this.eventQueue = []
    this.cacheStrategies = new Map()
    this.cacheMetrics = new Map()
    this.syncLocks = new Map()
    this.initializeService()
  }

  private async initializeService() {
    // Set up cache strategies
    this.setupCacheStrategies()
    
    // Initialize WebSocket handling
    this.setupWebSocketHandlers()
    
    // Set up event processing
    setInterval(() => this.processEventQueue(), 100) // Process queue every 100ms
    
    // Set up cache maintenance
    setInterval(() => this.maintainCache(), 60000) // Every minute
    
    // Set up metrics collection
    setInterval(() => this.collectMetrics(), 30000) // Every 30 seconds
  }

  attachToServer(io: SocketIOServer) {
    this.io = io
    
    // Set up Redis adapter for multi-server support
    io.adapter(createAdapter(this.pubClient, this.subClient))
    
    // Handle client connections
    io.on('connection', (socket) => {
      console.log(`Client connected: ${socket.id}`)
      
      // Handle channel subscriptions
      socket.on('subscribe', async (data) => {
        await this.handleSubscribe(socket, data)
      })
      
      // Handle data sync requests
      socket.on('sync', async (data) => {
        await this.handleSync(socket, data)
      })
      
      // Handle real-time updates
      socket.on('update', async (data) => {
        await this.handleUpdate(socket, data)
      })
      
      // Handle optimistic updates
      socket.on('optimistic-update', async (data) => {
        await this.handleOptimisticUpdate(socket, data)
      })
      
      // Handle disconnections
      socket.on('disconnect', () => {
        this.handleDisconnect(socket)
      })
    })
  }

  private setupCacheStrategies() {
    // User data cache strategy
    this.cacheStrategies.set('user', {
      ttl: 3600, // 1 hour
      invalidationRules: [
        { event: 'user.update', pattern: 'user:*', action: 'refresh' },
        { event: 'user.delete', pattern: 'user:*', action: 'delete' }
      ],
      compressionEnabled: false,
      distributedCache: true
    })
    
    // Trip data cache strategy
    this.cacheStrategies.set('trip', {
      ttl: 1800, // 30 minutes
      invalidationRules: [
        { event: 'trip.update', pattern: 'trip:*', action: 'refresh' },
        { event: 'activity.update', pattern: 'trip:*:activities', action: 'refresh' }
      ],
      compressionEnabled: true,
      distributedCache: true
    })
    
    // Search results cache strategy
    this.cacheStrategies.set('search', {
      ttl: 300, // 5 minutes
      invalidationRules: [
        { event: 'price.update', pattern: 'search:*', action: 'delete' },
        { event: 'availability.change', pattern: 'search:*', action: 'delete' }
      ],
      compressionEnabled: true,
      distributedCache: false
    })
    
    // AI recommendations cache strategy
    this.cacheStrategies.set('recommendations', {
      ttl: 900, // 15 minutes
      invalidationRules: [
        { event: 'profile.update', pattern: 'recommendations:*', action: 'delete' },
        { event: 'behavior.significant', pattern: 'recommendations:*', action: 'refresh' }
      ],
      compressionEnabled: true,
      distributedCache: true
    })
  }

  private async handleSubscribe(socket: any, data: any) {
    const { channel, filters } = data
    
    // Validate subscription
    if (!await this.validateSubscription(socket, channel)) {
      socket.emit('subscription-error', { error: 'Unauthorized' })
      return
    }
    
    // Join channel
    socket.join(channel)
    
    // Update channel info
    if (!this.channels.has(channel)) {
      this.channels.set(channel, {
        name: channel,
        subscribers: new Set(),
        lastActivity: new Date(),
        dataVersion: 1
      })
    }
    
    const channelInfo = this.channels.get(channel)!
    channelInfo.subscribers.add(socket.id)
    
    // Send initial data
    const initialData = await this.getInitialData(channel, filters)
    socket.emit('initial-sync', {
      channel,
      data: initialData,
      version: channelInfo.dataVersion
    })
  }

  private async handleSync(socket: any, data: any) {
    const { channel, lastVersion, entities } = data
    
    try {
      // Get changes since last version
      const changes = await this.getChangesSince(channel, lastVersion, entities)
      
      // Apply conflict resolution if needed
      const resolved = await this.resolveConflicts(changes, data.localChanges)
      
      socket.emit('sync-response', {
        channel,
        changes: resolved,
        version: this.channels.get(channel)?.dataVersion || 1
      })
    } catch (error) {
      socket.emit('sync-error', { error: error.message })
    }
  }

  private async handleUpdate(socket: any, data: any) {
    const { channel, entity, operation, payload } = data
    
    try {
      // Validate update
      if (!await this.validateUpdate(socket, channel, entity, operation)) {
        throw new Error('Unauthorized update')
      }
      
      // Apply update with distributed lock
      const lockKey = `lock:${channel}:${entity}:${payload.id}`
      const locked = await this.acquireLock(lockKey)
      
      if (!locked) {
        throw new Error('Resource locked')
      }
      
      try {
        // Perform update
        const result = await this.performUpdate(entity, operation, payload)
        
        // Create sync event
        const event: SyncEvent = {
          id: this.generateEventId(),
          channel,
          type: operation,
          entity,
          data: result,
          userId: socket.userId,
          timestamp: new Date(),
          version: this.incrementVersion(channel)
        }
        
        // Queue event for processing
        this.eventQueue.push(event)
        
        // Invalidate related caches
        await this.invalidateCaches(event)
        
        // Send confirmation
        socket.emit('update-success', { eventId: event.id, data: result })
      } finally {
        await this.releaseLock(lockKey)
      }
    } catch (error) {
      socket.emit('update-error', { error: error.message })
    }
  }

  private async handleOptimisticUpdate(socket: any, data: any) {
    const { channel, entity, operation, payload, clientId } = data
    
    // Immediately broadcast to other clients
    socket.to(channel).emit('optimistic-update', {
      clientId,
      entity,
      operation,
      payload,
      timestamp: new Date()
    })
    
    // Process actual update asynchronously
    this.handleUpdate(socket, data).then((result) => {
      // Broadcast final result
      this.io?.to(channel).emit('update-confirmed', {
        clientId,
        entity,
        operation,
        payload: result,
        timestamp: new Date()
      })
    }).catch((error) => {
      // Broadcast rollback
      this.io?.to(channel).emit('update-rollback', {
        clientId,
        entity,
        operation,
        error: error.message
      })
    })
  }

  private async processEventQueue() {
    if (this.eventQueue.length === 0) return
    
    const events = this.eventQueue.splice(0, 100) // Process up to 100 events
    
    for (const event of events) {
      try {
        // Broadcast to channel subscribers
        this.io?.to(event.channel).emit('data-update', event)
        
        // Store event for sync history
        await this.storeEvent(event)
        
        // Update channel activity
        const channel = this.channels.get(event.channel)
        if (channel) {
          channel.lastActivity = new Date()
        }
      } catch (error) {
        console.error('Error processing event:', error)
        // Re-queue failed events
        this.eventQueue.push(event)
      }
    }
  }

  // Advanced caching methods
  async cacheData(key: string, data: any, strategy: string): Promise<void> {
    const cacheStrategy = this.cacheStrategies.get(strategy)
    if (!cacheStrategy) throw new Error(`Unknown cache strategy: ${strategy}`)
    
    try {
      let cacheData = data
      
      // Apply compression if enabled
      if (cacheStrategy.compressionEnabled) {
        cacheData = await this.compress(data)
      }
      
      // Store in cache with TTL
      if (cacheStrategy.distributedCache) {
        // Use Redis for distributed caching
        await redis.setex(
          `cache:${key}`,
          cacheStrategy.ttl,
          JSON.stringify(cacheData)
        )
      } else {
        // Use local memory cache (not shown for brevity)
        // this.localCache.set(key, cacheData, cacheStrategy.ttl)
      }
      
      // Update metrics
      this.updateCacheMetrics(strategy, 'set')
    } catch (error) {
      console.error('Cache write error:', error)
      throw error
    }
  }

  async getCachedData(key: string, strategy: string): Promise<any | null> {
    const cacheStrategy = this.cacheStrategies.get(strategy)
    if (!cacheStrategy) return null
    
    try {
      let cachedData
      
      if (cacheStrategy.distributedCache) {
        cachedData = await redis.get(`cache:${key}`)
      } else {
        // cachedData = this.localCache.get(key)
      }
      
      if (!cachedData) {
        this.updateCacheMetrics(strategy, 'miss')
        return null
      }
      
      this.updateCacheMetrics(strategy, 'hit')
      
      // Decompress if needed
      if (cacheStrategy.compressionEnabled) {
        return await this.decompress(JSON.parse(cachedData))
      }
      
      return JSON.parse(cachedData)
    } catch (error) {
      console.error('Cache read error:', error)
      return null
    }
  }

  private async invalidateCaches(event: SyncEvent) {
    // Find all cache strategies with matching invalidation rules
    for (const [strategyName, strategy] of this.cacheStrategies) {
      for (const rule of strategy.invalidationRules) {
        if (this.matchesEvent(event, rule.event)) {
          await this.executeInvalidation(rule, event)
        }
      }
    }
  }

  private async executeInvalidation(rule: InvalidationRule, event: SyncEvent) {
    const keys = await this.findMatchingKeys(rule.pattern)
    
    for (const key of keys) {
      switch (rule.action) {
        case 'delete':
          await redis.del(key)
          break
        case 'refresh':
          // Mark for refresh on next access
          await redis.expire(key, 1)
          break
        case 'update':
          // Update specific fields
          await this.updateCachedData(key, event.data)
          break
      }
    }
  }

  // Multi-tier caching with write-through and write-behind
  async multiTierCache(key: string, fetchFn: () => Promise<any>): Promise<any> {
    // Level 1: Memory cache (fastest)
    const memoryData = this.getMemoryCache(key)
    if (memoryData) return memoryData
    
    // Level 2: Redis cache (distributed)
    const redisData = await this.getCachedData(key, 'default')
    if (redisData) {
      this.setMemoryCache(key, redisData)
      return redisData
    }
    
    // Level 3: Database (persistent)
    const dbData = await fetchFn()
    
    // Write-through caching
    await Promise.all([
      this.cacheData(key, dbData, 'default'),
      this.setMemoryCache(key, dbData)
    ])
    
    return dbData
  }

  // Cache warming for predictive loading
  async warmCache(userId: string, context: any) {
    try {
      // Predict what data user will need
      const predictions = await this.predictUserNeeds(userId, context)
      
      // Warm caches in parallel
      await Promise.all(predictions.map(async (prediction) => {
        const key = prediction.key
        const data = await prediction.fetchFn()
        await this.cacheData(key, data, prediction.strategy)
      }))
    } catch (error) {
      console.error('Cache warming error:', error)
    }
  }

  private async predictUserNeeds(userId: string, context: any): Promise<any[]> {
    // Analyze user patterns and current context
    const userPatterns = await this.getUserPatterns(userId)
    const predictions = []
    
    // Predict based on time of day
    const hour = new Date().getHours()
    if (hour >= 18 && hour <= 21) {
      // Evening - likely planning next day
      predictions.push({
        key: `recommendations:${userId}:tomorrow`,
        fetchFn: () => this.getTomorrowRecommendations(userId),
        strategy: 'recommendations'
      })
    }
    
    // Predict based on recent searches
    if (context.recentSearches?.includes('flights')) {
      predictions.push({
        key: `popular-routes:${userId}`,
        fetchFn: () => this.getPopularRoutes(userId),
        strategy: 'search'
      })
    }
    
    return predictions
  }

  // Utility methods
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private incrementVersion(channel: string): number {
    const channelInfo = this.channels.get(channel)
    if (channelInfo) {
      channelInfo.dataVersion++
      return channelInfo.dataVersion
    }
    return 1
  }

  private async acquireLock(key: string, ttl = 5000): Promise<boolean> {
    const result = await redis.set(key, '1', 'PX', ttl, 'NX')
    return result === 'OK'
  }

  private async releaseLock(key: string): Promise<void> {
    await redis.del(key)
  }

  private updateCacheMetrics(strategy: string, operation: 'hit' | 'miss' | 'set') {
    if (!this.cacheMetrics.has(strategy)) {
      this.cacheMetrics.set(strategy, {
        hits: 0,
        misses: 0,
        evictions: 0,
        size: 0,
        hitRate: 0
      })
    }
    
    const metrics = this.cacheMetrics.get(strategy)!
    
    switch (operation) {
      case 'hit':
        metrics.hits++
        break
      case 'miss':
        metrics.misses++
        break
    }
    
    metrics.hitRate = metrics.hits / (metrics.hits + metrics.misses)
  }

  private getMemoryCache(key: string): any | null {
    // Implementation of in-memory cache
    return null // Placeholder
  }

  private setMemoryCache(key: string, data: any): void {
    // Implementation of in-memory cache
  }

  private async compress(data: any): Promise<any> {
    // Implementation of data compression
    return data // Placeholder
  }

  private async decompress(data: any): Promise<any> {
    // Implementation of data decompression
    return data // Placeholder
  }

  private matchesEvent(event: SyncEvent, pattern: string): boolean {
    // Implementation of event pattern matching
    return event.type === pattern.split('.')[1]
  }

  private async findMatchingKeys(pattern: string): Promise<string[]> {
    // Implementation of Redis key pattern matching
    return [] // Placeholder
  }

  private async updateCachedData(key: string, data: any): Promise<void> {
    // Implementation of partial cache update
  }

  private handleDisconnect(socket: any): void {
    // Remove from all channels
    for (const [_, channel] of this.channels) {
      channel.subscribers.delete(socket.id)
    }
  }

  private async validateSubscription(socket: any, channel: string): Promise<boolean> {
    // Implementation of subscription validation
    return true // Placeholder
  }

  private async getInitialData(channel: string, filters: any): Promise<any> {
    // Implementation of initial data fetching
    return {} // Placeholder
  }

  private async getChangesSince(channel: string, version: number, entities: string[]): Promise<any> {
    // Implementation of change tracking
    return [] // Placeholder
  }

  private async resolveConflicts(serverChanges: any, localChanges: any): Promise<any> {
    // Implementation of conflict resolution
    return serverChanges // Placeholder
  }

  private async validateUpdate(socket: any, channel: string, entity: string, operation: string): Promise<boolean> {
    // Implementation of update validation
    return true // Placeholder
  }

  private async performUpdate(entity: string, operation: string, payload: any): Promise<any> {
    // Implementation of database update
    return payload // Placeholder
  }

  private async storeEvent(event: SyncEvent): Promise<void> {
    // Store in event history
    await prisma.sync_events.create({
      data: {
        event_id: event.id,
        channel: event.channel,
        type: event.type,
        entity: event.entity,
        data: event.data,
        user_id: event.userId,
        version: event.version
      }
    })
  }

  private async maintainCache(): Promise<void> {
    // Perform cache maintenance tasks
    console.log('Performing cache maintenance...')
  }

  private async collectMetrics(): Promise<void> {
    // Collect and store metrics
    const metrics = {
      channels: this.channels.size,
      queueSize: this.eventQueue.length,
      cacheMetrics: Object.fromEntries(this.cacheMetrics)
    }
    
    await redis.setex('sync:metrics', 300, JSON.stringify(metrics))
  }

  private async getUserPatterns(userId: string): Promise<any> {
    // Implementation of user pattern analysis
    return {} // Placeholder
  }

  private async getTomorrowRecommendations(userId: string): Promise<any> {
    // Implementation of recommendation fetching
    return {} // Placeholder
  }

  private async getPopularRoutes(userId: string): Promise<any> {
    // Implementation of popular routes fetching
    return {} // Placeholder
  }
}

// Export singleton instance
export const realtimeSyncService = new RealtimeSyncService()