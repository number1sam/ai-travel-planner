import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/middleware/auth'
import { GDPRService } from '@/services/GDPRService'
import { AuditService } from '@/lib/audit'

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authMiddleware(request)
    if (authResult) return authResult

    const user = (request as any).user
    const clientIP = request.headers.get('x-forwarded-for') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Request data export
    const exportRequest = await GDPRService.requestDataExport(user.id)

    // Log the request
    await AuditService.logDataAccess({
      userId: user.id,
      dataType: 'user_profile',
      action: 'export',
      ipAddress: clientIP,
      userAgent: userAgent,
      result: 'success'
    })

    return NextResponse.json({
      success: true,
      message: 'Data export request submitted successfully',
      requestId: exportRequest.userId,
      estimatedCompletion: '72 hours'
    })

  } catch (error) {
    console.error('GDPR data export error:', error)
    return NextResponse.json(
      { error: 'Failed to process data export request' },
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

    // Get export request status
    const exportRequests = await prisma.dataExportRequest.findMany({
      where: { userId: user.id },
      orderBy: { requestDate: 'desc' },
      take: 10
    })

    return NextResponse.json({
      requests: exportRequests.map(req => ({
        id: req.id,
        requestDate: req.requestDate,
        status: req.status,
        downloadUrl: req.downloadUrl
      }))
    })

  } catch (error) {
    console.error('GDPR export status error:', error)
    return NextResponse.json(
      { error: 'Failed to get export status' },
      { status: 500 }
    )
  }
}