import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { error: 'Verification token is required' },
        { status: 400 }
      )
    }

    // Find the verification record
    const verification = await prisma.emailVerification.findUnique({
      where: { token },
      include: { user: true }
    })

    if (!verification) {
      return NextResponse.json(
        { error: 'Invalid verification token' },
        { status: 400 }
      )
    }

    // Check if token has expired
    if (verification.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Verification token has expired' },
        { status: 400 }
      )
    }

    // Check if already verified
    if (verification.verified) {
      return NextResponse.json(
        { message: 'Email already verified' },
        { status: 200 }
      )
    }

    // Update verification status and user status
    await prisma.$transaction([
      prisma.emailVerification.update({
        where: { id: verification.id },
        data: { verified: true }
      }),
      prisma.user.update({
        where: { id: verification.userId },
        data: { status: 'Active' }
      })
    ])

    logger.logUserAction(verification.userId, 'email_verified', {
      email: verification.user.email
    })

    // Redirect to success page or login
    return NextResponse.redirect(new URL('/auth?verified=true', request.url))

  } catch (error) {
    logger.error('Email verification error', error as Error, { service: 'auth' })
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if already verified
    if (user.status === 'Active') {
      return NextResponse.json(
        { message: 'Email already verified' },
        { status: 200 }
      )
    }

    // Generate new verification token
    const crypto = require('crypto')
    const verificationToken = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    // Delete old verification tokens for this user
    await prisma.emailVerification.deleteMany({
      where: { userId: user.id }
    })

    // Create new verification token
    await prisma.emailVerification.create({
      data: {
        userId: user.id,
        token: verificationToken,
        expiresAt
      }
    })

    // Send new verification email
    await sendVerificationEmail(email, user.name, verificationToken)

    logger.logUserAction(user.id, 'verification_email_resent', { email })

    return NextResponse.json({
      message: 'Verification email sent successfully'
    })

  } catch (error) {
    logger.error('Resend verification error', error as Error, { service: 'auth' })
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function sendVerificationEmail(email: string, name: string, token: string) {
  const verificationUrl = `${process.env.NEXTAUTH_URL}/api/auth/verify-email?token=${token}`
  
  console.log(`
    📧 Email Verification Resent
    
    Dear ${name},
    
    You requested a new email verification link.
    
    Please verify your email address by clicking the link below:
    ${verificationUrl}
    
    This link will expire in 24 hours.
    
    Best regards,
    The Travel Planner Team
  `)
}