import Redis from 'ioredis'

class RedisClient {
  private static instance: Redis | null = null

  public static getInstance(): Redis {
    if (!RedisClient.instance) {
      RedisClient.instance = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        db: 0,
        retryDelayOnFailover: 100,
        enableReadyCheck: false,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      })

      RedisClient.instance.on('error', (err) => {
        console.error('Redis connection error:', err)
      })

      RedisClient.instance.on('connect', () => {
        console.log('Connected to Redis')
      })
    }

    return RedisClient.instance
  }

  // Cache helper methods
  public static async get(key: string): Promise<any> {
    try {
      const client = RedisClient.getInstance()
      const value = await client.get(key)
      return value ? JSON.parse(value) : null
    } catch (error) {
      console.error('Redis GET error:', error)
      return null
    }
  }

  public static async set(key: string, value: any, ttl?: number): Promise<boolean> {
    try {
      const client = RedisClient.getInstance()
      const serializedValue = JSON.stringify(value)
      
      if (ttl) {
        await client.setex(key, ttl, serializedValue)
      } else {
        await client.set(key, serializedValue)
      }
      
      return true
    } catch (error) {
      console.error('Redis SET error:', error)
      return false
    }
  }

  public static async del(key: string): Promise<boolean> {
    try {
      const client = RedisClient.getInstance()
      await client.del(key)
      return true
    } catch (error) {
      console.error('Redis DEL error:', error)
      return false
    }
  }

  // Session management
  public static async setSession(token: string, data: any, ttl: number = 3600): Promise<boolean> {
    return RedisClient.set(`session:${token}`, data, ttl)
  }

  public static async getSession(token: string): Promise<any> {
    return RedisClient.get(`session:${token}`)
  }

  public static async deleteSession(token: string): Promise<boolean> {
    return RedisClient.del(`session:${token}`)
  }

  // Rate limiting
  public static async incrementRateLimit(key: string, ttl: number = 60): Promise<number> {
    try {
      const client = RedisClient.getInstance()
      const current = await client.incr(key)
      
      if (current === 1) {
        await client.expire(key, ttl)
      }
      
      return current
    } catch (error) {
      console.error('Redis rate limit error:', error)
      return 0
    }
  }

  // Cache popular data
  public static async cacheFlightData(searchKey: string, data: any, ttl: number = 1800): Promise<boolean> {
    return RedisClient.set(`flights:${searchKey}`, data, ttl)
  }

  public static async getCachedFlightData(searchKey: string): Promise<any> {
    return RedisClient.get(`flights:${searchKey}`)
  }

  public static async cacheHotelData(searchKey: string, data: any, ttl: number = 1800): Promise<boolean> {
    return RedisClient.set(`hotels:${searchKey}`, data, ttl)
  }

  public static async getCachedHotelData(searchKey: string): Promise<any> {
    return RedisClient.get(`hotels:${searchKey}`)
  }

  public static async cacheActivityData(searchKey: string, data: any, ttl: number = 3600): Promise<boolean> {
    return RedisClient.set(`activities:${searchKey}`, data, ttl)
  }

  public static async getCachedActivityData(searchKey: string): Promise<any> {
    return RedisClient.get(`activities:${searchKey}`)
  }
}

export default RedisClient