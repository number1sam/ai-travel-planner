import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const attachmentId = formData.get('attachmentId') as string

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))

    // Simulate occasional upload failures (10% chance)
    if (Math.random() < 0.1) {
      return NextResponse.json(
        { error: 'Upload failed - please try again' },
        { status: 500 }
      )
    }

    // Return successful upload response
    // In a real app, you'd save to cloud storage and return the actual URL
    return NextResponse.json({
      attachmentId,
      url: `/api/files/${attachmentId}`, // Mock URL
      name: file.name,
      size: file.size,
      type: file.type,
      uploadedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('Upload API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}