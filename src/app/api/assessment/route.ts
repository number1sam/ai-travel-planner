import { NextRequest, NextResponse } from 'next/server'
import { UserAssessmentService } from '@/services/UserAssessmentService'
import { verifyAuth } from '@/lib/auth'

const assessmentService = new UserAssessmentService()

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request)
    if (!auth.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const assessmentId = searchParams.get('assessmentId')

    switch (action) {
      case 'start':
        const assessment = await assessmentService.startAssessment(auth.userId)
        return NextResponse.json({ success: true, data: assessment })

      case 'status':
        if (!assessmentId) {
          return NextResponse.json({ error: 'Assessment ID required' }, { status: 400 })
        }
        const status = await assessmentService.getAssessmentStatus(assessmentId)
        return NextResponse.json({ success: true, data: status })

      case 'profile':
        const profile = await assessmentService.getUserProfile(auth.userId)
        return NextResponse.json({ success: true, data: profile })

      case 'recommendations':
        const recommendations = await assessmentService.generatePersonalizedRecommendations(auth.userId)
        return NextResponse.json({ success: true, data: recommendations })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Assessment API error:', error)
    return NextResponse.json(
      { error: 'Failed to process assessment request' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request)
    if (!auth.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, ...data } = body

    switch (action) {
      case 'submit-answer':
        const { assessmentId, questionId, answer } = data
        if (!assessmentId || !questionId || answer === undefined) {
          return NextResponse.json(
            { error: 'Assessment ID, question ID, and answer are required' },
            { status: 400 }
          )
        }

        const result = await assessmentService.submitAnswer(assessmentId, questionId, answer)
        return NextResponse.json({ success: true, data: result })

      case 'track-behavior':
        const { eventType, eventData } = data
        if (!eventType || !eventData) {
          return NextResponse.json(
            { error: 'Event type and data are required' },
            { status: 400 }
          )
        }

        await assessmentService.trackBehavioralEvent(auth.userId, eventType, eventData)
        return NextResponse.json({ success: true })

      case 'update-profile':
        const { profileUpdates } = data
        if (!profileUpdates) {
          return NextResponse.json(
            { error: 'Profile updates are required' },
            { status: 400 }
          )
        }

        const updatedProfile = await assessmentService.updateUserProfile(auth.userId, profileUpdates)
        return NextResponse.json({ success: true, data: updatedProfile })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Assessment POST API error:', error)
    return NextResponse.json(
      { error: 'Failed to process assessment request' },
      { status: 500 }
    )
  }
}