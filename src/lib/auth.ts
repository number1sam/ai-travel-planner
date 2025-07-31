import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'
import RedisClient from './redis'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret'

export interface JWTPayload {
  userId: string
  email: string
  subscriptionTier: string
  role?: string
}

export class AuthService {
  // Hash password
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12
    return bcrypt.hash(password, saltRounds)
  }

  // Verify password
  static async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword)
  }

  // Generate JWT tokens
  static generateTokens(payload: JWTPayload): { accessToken: string; refreshToken: string } {
    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' })
    const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' })
    
    return { accessToken, refreshToken }
  }

  // Verify JWT token
  static verifyToken(token: string): JWTPayload | null {
    try {
      return jwt.verify(token, JWT_SECRET) as JWTPayload
    } catch (error) {
      return null
    }
  }

  // Verify refresh token
  static verifyRefreshToken(token: string): JWTPayload | null {
    try {
      return jwt.verify(token, JWT_REFRESH_SECRET) as JWTPayload
    } catch (error) {
      return null
    }
  }

  // Create user session
  static async createSession(userId: string, tokens: { accessToken: string; refreshToken: string }): Promise<string> {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    // Store in database
    await prisma.userSession.create({
      data: {
        id: sessionId,
        userId,
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt,
      }
    })

    // Store in Redis for fast access
    await RedisClient.setSession(sessionId, {
      userId,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    }, 7 * 24 * 60 * 60) // 7 days in seconds

    return sessionId
  }

  // Get session
  static async getSession(sessionId: string): Promise<any> {
    // Try Redis first
    let session = await RedisClient.getSession(sessionId)
    
    if (!session) {
      // Fallback to database
      const dbSession = await prisma.userSession.findUnique({
        where: { id: sessionId },
        include: { user: true }
      })
      
      if (dbSession && dbSession.expiresAt > new Date()) {
        session = {
          userId: dbSession.userId,
          accessToken: dbSession.token,
          refreshToken: dbSession.refreshToken,
          user: dbSession.user
        }
        
        // Cache back to Redis
        await RedisClient.setSession(sessionId, session, 7 * 24 * 60 * 60)
      }
    }

    return session
  }

  // Refresh tokens
  static async refreshTokens(refreshToken: string): Promise<{ accessToken: string; refreshToken: string } | null> {
    const payload = AuthService.verifyRefreshToken(refreshToken)
    if (!payload) return null

    // Check if user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: payload.userId }
    })

    if (!user || user.status !== 'Active') return null

    // Generate new tokens
    const newTokens = AuthService.generateTokens({
      userId: user.id,
      email: user.email,
      subscriptionTier: user.subscriptionTier
    })

    // Update session with new tokens
    await prisma.userSession.updateMany({
      where: { refreshToken },
      data: {
        token: newTokens.accessToken,
        refreshToken: newTokens.refreshToken,
      }
    })

    return newTokens
  }

  // Logout
  static async logout(sessionId: string): Promise<void> {
    // Remove from Redis
    await RedisClient.deleteSession(sessionId)
    
    // Remove from database
    await prisma.userSession.delete({
      where: { id: sessionId }
    }).catch(() => {}) // Ignore if not found
  }

  // Role-based access control
  static hasRole(user: any, requiredRole: string): boolean {
    if (requiredRole === 'admin') {
      return user.email?.endsWith('@aitravelplanner.com') || user.role === 'admin'
    }
    
    return user.role === requiredRole || user.subscriptionTier === requiredRole
  }

  // Rate limiting for authentication attempts
  static async checkRateLimit(identifier: string, maxAttempts: number = 5): Promise<{ allowed: boolean; remaining: number }> {
    const key = `auth_attempts:${identifier}`
    const attempts = await RedisClient.incrementRateLimit(key, 15 * 60) // 15 minutes
    
    return {
      allowed: attempts <= maxAttempts,
      remaining: Math.max(0, maxAttempts - attempts)
    }
  }

  // Security logging
  static async logSecurityEvent(event: string, userId?: string, details?: any): Promise<void> {
    console.log(`Security Event: ${event}`, {
      userId,
      timestamp: new Date().toISOString(),
      details
    })

    // In production, this would send to a proper logging service
    // like ELK Stack, Splunk, or AWS CloudWatch
  }
}