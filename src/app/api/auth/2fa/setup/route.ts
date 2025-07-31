import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { authOptions } from '../../[...nextauth]/route'
import { getServerSession } from 'next-auth'
import speakeasy from 'speakeasy'
import QRCode from 'qrcode'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = session.user.id

    // Check if 2FA is already enabled
    const existing2FA = await prisma.twoFactorAuth.findUnique({
      where: { userId }
    })

    if (existing2FA?.enabled) {
      return NextResponse.json(
        { error: '2FA is already enabled for this account' },
        { status: 400 }
      )
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      length: 32,
      name: `Travel Planner (${session.user.email})`,
      issuer: 'AI Travel & Health Planner'
    })

    // Generate backup codes
    const backupCodes = Array.from({ length: 10 }, () => 
      Math.random().toString(36).substring(2, 15).toUpperCase()
    )

    // Store or update 2FA record (but don't enable yet)
    await prisma.twoFactorAuth.upsert({
      where: { userId },
      update: {
        secret: secret.base32,
        backupCodes: backupCodes,
        enabled: false
      },
      create: {
        userId,
        secret: secret.base32,
        backupCodes: backupCodes,
        enabled: false
      }
    })

    // Generate QR code
    const qrCodeDataURL = await QRCode.toDataURL(secret.otpauth_url!)

    logger.logUserAction(userId, '2fa_setup_initiated', {
      email: session.user.email
    })

    return NextResponse.json({
      secret: secret.base32,
      qrCode: qrCodeDataURL,
      backupCodes: backupCodes,
      manualEntryKey: secret.base32
    })

  } catch (error) {
    logger.error('2FA setup error', error as Error, { service: 'auth' })
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = session.user.id

    // Get 2FA status
    const twoFactorAuth = await prisma.twoFactorAuth.findUnique({
      where: { userId },
      select: {
        enabled: true,
        createdAt: true
      }
    })

    return NextResponse.json({
      enabled: twoFactorAuth?.enabled || false,
      setupDate: twoFactorAuth?.createdAt || null
    })

  } catch (error) {
    logger.error('2FA status check error', error as Error, { service: 'auth' })
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}