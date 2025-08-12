import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { text, attachments, clientId } = body

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000))

    // Simulate occasional failures (5% chance)
    if (Math.random() < 0.05) {
      return NextResponse.json(
        { error: 'Network error - please try again' },
        { status: 500 }
      )
    }

    // Return successful response
    return NextResponse.json({
      id: `server-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date().toISOString(),
      text,
      attachments,
      clientId,
      status: 'sent'
    })

  } catch (error) {
    console.error('Message API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}