import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/middleware/auth'
import { GDPRService } from '@/services/GDPRService'
import { z } from 'zod'

const consentSchema = z.object({
  marketing: z.boolean().optional(),
  analytics: z.boolean().optional(),
  personalization: z.boolean().optional()
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
    const validationResult = consentSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid consent data', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const consent = validationResult.data

    // Update consent preferences
    await GDPRService.updateConsent(user.id, consent, clientIP, userAgent)

    return NextResponse.json({
      success: true,
      message: 'Consent preferences updated successfully'
    })

  } catch (error) {
    console.error('GDPR consent update error:', error)
    return NextResponse.json(
      { error: 'Failed to update consent preferences' },
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

    // Get current consent status
    const consentStatus = await GDPRService.getConsentStatus(user.id)

    return NextResponse.json({
      consent: consentStatus
    })

  } catch (error) {
    console.error('GDPR consent status error:', error)
    return NextResponse.json(
      { error: 'Failed to get consent status' },
      { status: 500 }
    )
  }
}