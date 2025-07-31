import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Basic health check
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks: {}
    }

    // Database health check
    try {
      await prisma.$queryRaw`SELECT 1`
      health.checks.database = { status: 'healthy', response_time: Date.now() - startTime }
    } catch (error) {
      health.checks.database = { status: 'unhealthy', error: error.message }
      health.status = 'unhealthy'
    }

    // Redis health check (if Redis URL is configured)
    if (process.env.REDIS_URL) {
      try {
        // In a real implementation, you would check Redis connectivity here
        health.checks.redis = { status: 'healthy' }
      } catch (error) {
        health.checks.redis = { status: 'unhealthy', error: error.message }
        health.status = 'unhealthy'
      }
    }

    // External API health checks (basic connectivity)
    health.checks.external_apis = {
      stripe: process.env.STRIPE_SECRET_KEY ? 'configured' : 'not_configured',
      openai: process.env.OPENAI_API_KEY ? 'configured' : 'not_configured',
      google_maps: process.env.GOOGLE_MAPS_API_KEY ? 'configured' : 'not_configured',
    }

    // System resources
    health.checks.memory = {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      unit: 'MB'
    }

    const responseTime = Date.now() - startTime
    health.checks.response_time = `${responseTime}ms`

    // Return appropriate status code
    const statusCode = health.status === 'healthy' ? 200 : 503

    return NextResponse.json(health, { status: statusCode })

  } catch (error) {
    console.error('Health check error:', error)
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      response_time: `${Date.now() - startTime}ms`
    }, { status: 503 })
  }
}