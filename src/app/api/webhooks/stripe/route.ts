import { NextRequest, NextResponse } from 'next/server'
import { PaymentEngine } from '@/services/PaymentEngine'

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      console.error('Stripe webhook: Missing signature')
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      )
    }

    // Process the webhook
    const result = await PaymentEngine.handleStripeWebhook(body, signature)

    if (result.processed) {
      console.log(`Stripe webhook processed successfully: ${result.event?.type}`)
      return NextResponse.json({ received: true })
    } else {
      console.error('Stripe webhook processing failed')
      return NextResponse.json(
        { error: 'Webhook processing failed' },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('Stripe webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

// Ensure raw body is available for webhook signature verification
export const runtime = 'nodejs'