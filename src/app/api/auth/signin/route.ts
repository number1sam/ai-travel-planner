import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { userStorage } from '@/lib/userStorage'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Find user
    const user = userStorage.findUserByEmail(email)
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    console.log('User signed in successfully:', user.email)

    // Return success (don't include password)
    const { password: _, ...userWithoutPassword } = user
    
    return NextResponse.json({
      message: 'Signed in successfully',
      user: userWithoutPassword
    }, { status: 200 })

  } catch (error) {
    console.error('Signin error:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}