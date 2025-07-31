import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/middleware/auth'
import { RBACMiddleware } from '@/middleware/security'
import { AuditService } from '@/lib/audit'
import { SecurityCronService } from '@/services/SecurityCronService'
import { z } from 'zod'

const alertActionSchema = z.object({
  alertId: z.string(),
  action: z.enum(['resolve', 'escalate'])
})

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authMiddleware(request)
    if (authResult) return authResult

    const user = (request as any).user

    // Check admin permissions
    const permissionResult = await RBACMiddleware.requirePermission('system:manage')(request, user)
    if (permissionResult) return permissionResult

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const severity = searchParams.get('severity')
    const resolved = searchParams.get('resolved') === 'true'

    // Get security alerts
    const alerts = await AuditService.getSecurityAlerts({
      severity: severity || undefined,
      resolved,
      limit,
      offset: (page - 1) * limit
    })

    // Get system status
    const systemStatus = await SecurityCronService.getSystemStatus()

    // Get recent audit logs
    const auditLogs = await AuditService.getAuditLogs({
      limit: 10,
      offset: 0
    })

    // Get security metrics
    const now = new Date()
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const [
      alertsLast24h,
      alertsLast7d,
      failedLoginsLast24h,
      totalUsers,
      activeUsers
    ] = await Promise.all([
      prisma.securityAlert.count({
        where: {
          timestamp: { gte: last24Hours }
        }
      }),
      prisma.securityAlert.count({
        where: {
          timestamp: { gte: last7Days }
        }
      }),
      prisma.auditLog.count({
        where: {
          action: 'LOGIN_FAILED',
          timestamp: { gte: last24Hours }
        }
      }),
      prisma.user.count(),
      prisma.user.count({
        where: {
          lastLogin: { gte: last7Days }
        }
      })
    ])

    return NextResponse.json({
      alerts: alerts.alerts,
      totalAlerts: alerts.total,
      systemStatus,
      recentLogs: auditLogs.logs,
      metrics: {
        alertsLast24h,
        alertsLast7d,
        failedLoginsLast24h,
        totalUsers,
        activeUsers,
        systemHealth: systemStatus.systemHealth
      }
    })

  } catch (error) {
    console.error('Admin security dashboard error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch security data' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authMiddleware(request)
    if (authResult) return authResult

    const user = (request as any).user

    // Check admin permissions
    const permissionResult = await RBACMiddleware.requirePermission('system:manage')(request, user)
    if (permissionResult) return permissionResult

    const body = await request.json()
    const clientIP = request.headers.get('x-forwarded-for') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Validate request body
    const validationResult = alertActionSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { alertId, action } = validationResult.data

    if (action === 'resolve') {
      // Resolve security alert
      await AuditService.resolveSecurityAlert(alertId, user.id)

      // Log admin action
      await AuditService.logAction({
        userId: user.id,
        action: 'SECURITY_ALERT_RESOLVED',
        resource: 'security_alert',
        resourceId: alertId,
        ipAddress: clientIP,
        userAgent: userAgent,
        timestamp: new Date(),
        result: 'success'
      })

      return NextResponse.json({
        success: true,
        message: 'Security alert resolved successfully'
      })
    }

    if (action === 'escalate') {
      // Escalate security alert (in production, this would notify security team)
      await AuditService.logAction({
        userId: user.id,
        action: 'SECURITY_ALERT_ESCALATED',
        resource: 'security_alert',
        resourceId: alertId,
        ipAddress: clientIP,
        userAgent: userAgent,
        timestamp: new Date(),
        result: 'success'
      })

      return NextResponse.json({
        success: true,
        message: 'Security alert escalated successfully'
      })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Admin security action error:', error)
    return NextResponse.json(
      { error: 'Failed to process security action' },
      { status: 500 }
    )
  }
}