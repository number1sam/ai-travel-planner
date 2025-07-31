import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/middleware/auth'
import { GDPRService } from '@/services/GDPRService'
import { AuditService } from '@/lib/audit'
import { z } from 'zod'

const deletionSchema = z.object({
  reason: z.string().optional()
})

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authMiddleware(request)
    if (authResult) return authResult

    const user = (request as any).user
    const body = await request.json()
    const clientIP = request.headers.get('x-forwarded-for') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Validate request body
    const validationResult = deletionSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      )
    }

    const { reason } = validationResult.data

    // Request data deletion
    const deletionRequest = await GDPRService.requestDataDeletion(user.id, reason)

    // Log the request
    await AuditService.logDataAccess({
      userId: user.id,
      dataType: 'user_profile',
      action: 'delete',
      ipAddress: clientIP,
      userAgent: userAgent,
      result: 'success'
    })

    return NextResponse.json({
      success: true,
      message: 'Data deletion request submitted successfully',
      scheduledDeletion: deletionRequest.scheduledDeletion,
      gracePeriod: '30 days'
    })

  } catch (error) {
    console.error('GDPR data deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to process data deletion request' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authMiddleware(request)
    if (authResult) return authResult

    const user = (request as any).user

    // Get deletion request status
    const deletionRequests = await prisma.dataDeletionRequest.findMany({
      where: { userId: user.id },
      orderBy: { requestDate: 'desc' },
      take: 10
    })

    return NextResponse.json({
      requests: deletionRequests.map(req => ({
        id: req.id,
        requestDate: req.requestDate,
        scheduledDeletion: req.scheduledDeletion,
        status: req.status,
        reason: req.reason
      }))
    })

  } catch (error) {
    console.error('GDPR deletion status error:', error)
    return NextResponse.json(
      { error: 'Failed to get deletion status' },
      { status: 500 }
    )
  }
}