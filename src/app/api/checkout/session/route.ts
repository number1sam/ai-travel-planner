import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/middleware/auth'
import { PaymentEngine } from '@/services/PaymentEngine'
import { z } from 'zod'

const checkoutSchema = z.object({
  planId: z.enum(['premium', 'pro']),
  billingPeriod: z.enum(['monthly', 'annual']),
  promoCode: z.string().optional(),
  paymentMethod: z.enum(['stripe', 'paypal']).default('stripe')
})

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authMiddleware(request)
    if (authResult) return authResult

    const user = (request as any).user
    const body = await request.json()

    // Validate request body
    const validationResult = checkoutSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { planId, billingPeriod, promoCode, paymentMethod } = validationResult.data

    // Check if user already has an active subscription
    if (user.subscriptionTier !== 'Free') {
      return NextResponse.json(
        { error: 'User already has an active subscription' },
        { status: 400 }
      )
    }

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
    const successUrl = `${baseUrl}/subscription/success`
    const cancelUrl = `${baseUrl}/pricing`

    let paymentSession

    if (paymentMethod === 'stripe') {
      // Create Stripe checkout session
      paymentSession = await PaymentEngine.createStripeCheckoutSession({
        userId: user.id,
        planId,
        billingPeriod,
        promoCode,
        successUrl,
        cancelUrl
      })
    } else {
      // Create PayPal payment
      paymentSession = await PaymentEngine.createPayPalPayment({
        userId: user.id,
        planId,
        billingPeriod,
        promoCode,
        returnUrl: successUrl,
        cancelUrl
      })
    }

    console.log(`Checkout session created: ${paymentSession.sessionId} for user ${user.id}`)

    return NextResponse.json({
      sessionId: paymentSession.sessionId,
      url: paymentSession.url,
      planId: paymentSession.planId,
      amount: paymentSession.amount,
      currency: paymentSession.currency
    })

  } catch (error) {
    console.error('Checkout session error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}