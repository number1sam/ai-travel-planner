import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { authOptions } from '../../[...nextauth]/route'
import { getServerSession } from 'next-auth'
import speakeasy from 'speakeasy'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { token, action } = body

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      )
    }

    const userId = session.user.id

    // Get 2FA record
    const twoFactorAuth = await prisma.twoFactorAuth.findUnique({
      where: { userId }
    })

    if (!twoFactorAuth) {
      return NextResponse.json(
        { error: '2FA is not set up for this account' },
        { status: 400 }
      )
    }

    let isValid = false

    // First, try TOTP verification
    const verified = speakeasy.totp.verify({
      secret: twoFactorAuth.secret,
      encoding: 'base32',
      token: token,
      window: 2 // Allow some time drift
    })

    if (verified) {
      isValid = true
    } else {
      // Try backup codes
      const backupCodes = twoFactorAuth.backupCodes as string[]
      if (backupCodes && backupCodes.includes(token.toUpperCase())) {
        isValid = true
        
        // Remove used backup code
        const updatedBackupCodes = backupCodes.filter(code => code !== token.toUpperCase())
        await prisma.twoFactorAuth.update({
          where: { userId },
          data: { backupCodes: updatedBackupCodes }
        })

        logger.logUserAction(userId, '2fa_backup_code_used', {
          email: session.user.email,
          remainingCodes: updatedBackupCodes.length
        })
      }
    }

    if (!isValid) {
      logger.warn('Invalid 2FA token attempt', {
        userId,
        email: session.user.email,
        service: 'auth'
      })

      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 400 }
      )
    }

    // Handle different actions
    switch (action) {
      case 'enable':
        // Enable 2FA
        await prisma.twoFactorAuth.update({
          where: { userId },
          data: { enabled: true }
        })

        logger.logUserAction(userId, '2fa_enabled', {
          email: session.user.email
        })

        return NextResponse.json({
          message: '2FA enabled successfully',
          enabled: true
        })

      case 'disable':
        // Disable 2FA
        await prisma.twoFactorAuth.update({
          where: { userId },
          data: { enabled: false }
        })

        logger.logUserAction(userId, '2fa_disabled', {
          email: session.user.email
        })

        return NextResponse.json({
          message: '2FA disabled successfully',
          enabled: false
        })

      case 'verify':
      default:
        // Just verify token
        logger.logUserAction(userId, '2fa_verified', {
          email: session.user.email
        })

        return NextResponse.json({
          message: 'Token verified successfully',
          valid: true
        })
    }

  } catch (error) {
    logger.error('2FA verification error', error as Error, { service: 'auth' })
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}