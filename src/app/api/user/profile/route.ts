import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET user profile
export async function GET(request: NextRequest) {
  try {
    // In a real app, you'd get user ID from JWT token
    // For now, we'll use a simple approach with email from localStorage
    const url = new URL(request.url)
    const email = url.searchParams.get('email')
    
    if (!email) {
      return NextResponse.json(
        { message: 'Email is required' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        subscriptionTier: true,
        accountCreated: true,
        lastLogin: true,
        country: true,
        preferredCurrency: true,
        travelPreferences: true,
        trips: {
          select: {
            id: true,
            destination: true,
            startDate: true,
            endDate: true,
            status: true,
            totalCost: true
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Profile fetch error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT update user profile
export async function PUT(request: NextRequest) {
  try {
    const { email, name, country, preferredCurrency, travelPreferences } = await request.json()
    
    if (!email) {
      return NextResponse.json(
        { message: 'Email is required' },
        { status: 400 }
      )
    }

    // Validate name if provided
    if (name && (name.trim().length < 1 || name.trim().length > 50)) {
      return NextResponse.json(
        { message: 'Name must be between 1 and 50 characters' },
        { status: 400 }
      )
    }

    const updateData: any = {}
    
    if (name !== undefined) updateData.name = name.trim()
    if (country !== undefined) updateData.country = country
    if (preferredCurrency !== undefined) updateData.preferredCurrency = preferredCurrency
    if (travelPreferences !== undefined) updateData.travelPreferences = travelPreferences

    const user = await prisma.user.update({
      where: { email },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        country: true,
        preferredCurrency: true,
        travelPreferences: true
      }
    })

    return NextResponse.json({
      message: 'Profile updated successfully',
      user
    })
  } catch (error) {
    console.error('Profile update error:', error)
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}