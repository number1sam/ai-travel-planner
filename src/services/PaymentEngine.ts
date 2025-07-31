import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/services/EmailService'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

export interface SubscriptionPlan {
  id: string
  name: string
  price: number
  currency: string
  interval: 'month' | 'year'
  features: string[]
  stripePriceId: string
}

export interface PaymentSession {
  sessionId: string
  url: string
  planId: string
  userId: string
  amount: number
  currency: string
}

export interface PromoCode {
  id: string
  code: string
  discount: number
  discountType: 'percentage' | 'fixed'
  validFrom: Date
  validTo: Date
  maxUses: number
  currentUses: number
  active: boolean
}

export class PaymentEngine {
  private static readonly SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
    {
      id: 'premium',
      name: 'Premium',
      price: 9.99,
      currency: 'GBP',
      interval: 'month',
      features: [
        'Unlimited trip planning',
        'Personalized AI itineraries',
        'Advanced health tracking',
        'Real-time flight updates',
        'Priority email support'
      ],
      stripePriceId: process.env.STRIPE_PREMIUM_PRICE_ID || 'price_premium'
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 19.99,
      currency: 'GBP',
      interval: 'month',
      features: [
        'Everything in Premium',
        'Priority support (24/7)',
        'Exclusive discounts (up to 15%)',
        'Concierge assistance',
        'White-glove trip planning'
      ],
      stripePriceId: process.env.STRIPE_PRO_PRICE_ID || 'price_pro'
    }
  ]

  // Create Stripe checkout session
  static async createStripeCheckoutSession(data: {
    userId: string
    planId: string
    billingPeriod: 'monthly' | 'annual'
    promoCode?: string
    successUrl: string
    cancelUrl: string
  }): Promise<PaymentSession> {
    try {
      const plan = PaymentEngine.SUBSCRIPTION_PLANS.find(p => p.id === data.planId)
      if (!plan) {
        throw new Error('Invalid subscription plan')
      }

      const user = await prisma.user.findUnique({
        where: { id: data.userId }
      })
      if (!user) {
        throw new Error('User not found')
      }

      // Apply promo code if provided
      let discountAmount = 0
      let couponId: string | undefined

      if (data.promoCode) {
        const promoResult = await PaymentEngine.validatePromoCode(data.promoCode, data.userId)
        if (promoResult.valid) {
          discountAmount = promoResult.discount
          couponId = await PaymentEngine.createStripeCoupon(promoResult.promoCode!)
        }
      }

      // Calculate final amount
      let unitAmount = plan.price * 100 // Convert to cents
      if (data.billingPeriod === 'annual') {
        unitAmount = unitAmount * 10 // 10 months price for annual (2 months free)
      }

      // Create Stripe checkout session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        customer_email: user.email,
        line_items: [
          {
            price_data: {
              currency: plan.currency.toLowerCase(),
              product_data: {
                name: `${plan.name} Plan`,
                description: `${plan.name} subscription - ${data.billingPeriod}`,
                metadata: {
                  planId: plan.id,
                  billingPeriod: data.billingPeriod
                }
              },
              unit_amount: unitAmount,
              recurring: {
                interval: data.billingPeriod === 'annual' ? 'year' : 'month'
              }
            },
            quantity: 1
          }
        ],
        mode: 'subscription',
        success_url: data.successUrl + '?session_id={CHECKOUT_SESSION_ID}',
        cancel_url: data.cancelUrl,
        discounts: couponId ? [{ coupon: couponId }] : undefined,
        metadata: {
          userId: data.userId,
          planId: data.planId,
          billingPeriod: data.billingPeriod,
          promoCode: data.promoCode || ''
        },
        subscription_data: {
          trial_period_days: plan.id === 'premium' || plan.id === 'pro' ? 14 : undefined,
          metadata: {
            userId: data.userId,
            planId: data.planId
          }
        }
      })

      // Store session in database for reference
      await prisma.transaction.create({
        data: {
          id: session.id,
          userId: data.userId,
          subscriptionPlan: data.planId,
          amount: (unitAmount - discountAmount) / 100,
          currency: plan.currency,
          status: 'pending',
          paymentMethod: 'stripe',
          transactionId: session.id,
          stripeSessionId: session.id
        }
      })

      console.log(`PaymentEngine: Created Stripe session ${session.id} for user ${data.userId}`)

      return {
        sessionId: session.id,
        url: session.url!,
        planId: data.planId,
        userId: data.userId,
        amount: (unitAmount - discountAmount) / 100,
        currency: plan.currency
      }
    } catch (error) {
      console.error('PaymentEngine: Error creating Stripe session:', error)
      throw error
    }
  }

  // Create PayPal payment
  static async createPayPalPayment(data: {
    userId: string
    planId: string
    billingPeriod: 'monthly' | 'annual'
    promoCode?: string
    returnUrl: string
    cancelUrl: string
  }): Promise<PaymentSession> {
    try {
      const plan = PaymentEngine.SUBSCRIPTION_PLANS.find(p => p.id === data.planId)
      if (!plan) {
        throw new Error('Invalid subscription plan')
      }

      // Apply promo code if provided
      let discountAmount = 0
      if (data.promoCode) {
        const promoResult = await PaymentEngine.validatePromoCode(data.promoCode, data.userId)
        if (promoResult.valid) {
          discountAmount = promoResult.discount
        }
      }

      // Calculate final amount
      let amount = plan.price
      if (data.billingPeriod === 'annual') {
        amount = amount * 10 // 10 months price for annual
      }
      amount -= discountAmount

      // Note: In production, you would use the new PayPal SDK
      // For now, we'll simulate PayPal payment creation
      const paymentId = `paypal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      // Store transaction record
      await prisma.transaction.create({
        data: {
          id: paymentId,
          userId: data.userId,
          subscriptionPlan: data.planId,
          amount: amount,
          currency: plan.currency,
          status: 'pending',
          paymentMethod: 'paypal',
          transactionId: paymentId
        }
      })

      console.log(`PaymentEngine: Created PayPal payment ${paymentId} for user ${data.userId}`)

      return {
        sessionId: paymentId,
        url: `https://www.paypal.com/checkoutnow?token=${paymentId}`,
        planId: data.planId,
        userId: data.userId,
        amount: amount,
        currency: plan.currency
      }
    } catch (error) {
      console.error('PaymentEngine: Error creating PayPal payment:', error)
      throw error
    }
  }

  // Handle Stripe webhook
  static async handleStripeWebhook(
    body: string, 
    signature: string
  ): Promise<{ processed: boolean; event?: any }> {
    try {
      const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!
      const event = stripe.webhooks.constructEvent(body, signature, endpointSecret)

      console.log(`PaymentEngine: Processing Stripe webhook: ${event.type}`)

      switch (event.type) {
        case 'checkout.session.completed':
          await PaymentEngine.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
          break
        
        case 'invoice.payment_succeeded':
          await PaymentEngine.handlePaymentSucceeded(event.data.object as Stripe.Invoice)
          break
          
        case 'invoice.payment_failed':
          await PaymentEngine.handlePaymentFailed(event.data.object as Stripe.Invoice)
          break
          
        case 'customer.subscription.deleted':
          await PaymentEngine.handleSubscriptionCancelled(event.data.object as Stripe.Subscription)
          break

        default:
          console.log(`PaymentEngine: Unhandled webhook event: ${event.type}`)
      }

      return { processed: true, event }
    } catch (error) {
      console.error('PaymentEngine: Webhook processing error:', error)
      return { processed: false }
    }
  }

  // Handle successful checkout
  private static async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    try {
      const userId = session.metadata?.userId
      const planId = session.metadata?.planId
      
      if (!userId || !planId) {
        throw new Error('Missing metadata in checkout session')
      }

      // Update user subscription
      await prisma.user.update({
        where: { id: userId },
        data: {
          subscriptionTier: planId === 'premium' ? 'Premium' : 'Pro',
          subscriptionStatus: 'active'
        }
      })

      // Update transaction record
      await prisma.transaction.updateMany({
        where: { stripeSessionId: session.id },
        data: {
          status: 'Success'
        }
      })

      // Send confirmation email
      const user = await prisma.user.findUnique({ where: { id: userId } })
      if (user) {
        await sendEmail({
          to: user.email,
          subject: 'Subscription Confirmed - AI Travel Planner',
          template: 'subscription_confirmed',
          data: {
            userName: user.name,
            planName: planId === 'premium' ? 'Premium' : 'Pro',
            amount: session.amount_total! / 100,
            currency: session.currency?.toUpperCase()
          }
        })
      }

      // Apply promo code usage if applicable
      const promoCode = session.metadata?.promoCode
      if (promoCode) {
        await PaymentEngine.incrementPromoCodeUsage(promoCode)
      }

      console.log(`PaymentEngine: Subscription activated for user ${userId}`)
    } catch (error) {
      console.error('PaymentEngine: Error handling checkout completion:', error)
    }
  }

  // Handle successful recurring payment
  private static async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    try {
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)
      const userId = subscription.metadata?.userId

      if (!userId) return

      // Create transaction record for recurring payment
      await prisma.transaction.create({
        data: {
          userId,
          subscriptionPlan: subscription.metadata?.planId || 'premium',
          amount: invoice.amount_paid / 100,
          currency: invoice.currency.toUpperCase(),
          status: 'Success',
          paymentMethod: 'stripe',
          transactionId: invoice.id
        }
      })

      // Send payment receipt
      const user = await prisma.user.findUnique({ where: { id: userId } })
      if (user) {
        await sendEmail({
          to: user.email,
          subject: 'Payment Receipt - AI Travel Planner',
          template: 'payment_receipt',
          data: {
            userName: user.name,
            amount: invoice.amount_paid / 100,
            currency: invoice.currency.toUpperCase(),
            invoiceUrl: invoice.hosted_invoice_url
          }
        })
      }

      console.log(`PaymentEngine: Recurring payment processed for user ${userId}`)
    } catch (error) {
      console.error('PaymentEngine: Error handling payment success:', error)
    }
  }

  // Handle failed payment
  private static async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    try {
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)
      const userId = subscription.metadata?.userId

      if (!userId) return

      // Send payment failure notification
      const user = await prisma.user.findUnique({ where: { id: userId } })
      if (user) {
        await sendEmail({
          to: user.email,
          subject: 'Payment Failed - AI Travel Planner',
          template: 'payment_failed',
          data: {
            userName: user.name,
            amount: invoice.amount_due / 100,
            currency: invoice.currency.toUpperCase(),
            updatePaymentUrl: `${process.env.FRONTEND_URL}/settings/billing`
          }
        })
      }

      // After multiple failures, subscription will be automatically cancelled by Stripe
      console.log(`PaymentEngine: Payment failed for user ${userId}`)
    } catch (error) {
      console.error('PaymentEngine: Error handling payment failure:', error)
    }
  }

  // Handle subscription cancellation
  private static async handleSubscriptionCancelled(subscription: Stripe.Subscription): Promise<void> {
    try {
      const userId = subscription.metadata?.userId

      if (!userId) return

      // Downgrade user to free plan
      await prisma.user.update({
        where: { id: userId },
        data: {
          subscriptionTier: 'Free',
          subscriptionStatus: 'cancelled'
        }
      })

      // Send cancellation confirmation
      const user = await prisma.user.findUnique({ where: { id: userId } })
      if (user) {
        await sendEmail({
          to: user.email,
          subject: 'Subscription Cancelled - AI Travel Planner',
          template: 'subscription_cancelled',
          data: {
            userName: user.name,
            cancellationDate: new Date().toLocaleDateString(),
            reactivateUrl: `${process.env.FRONTEND_URL}/pricing`
          }
        })
      }

      console.log(`PaymentEngine: Subscription cancelled for user ${userId}`)
    } catch (error) {
      console.error('PaymentEngine: Error handling subscription cancellation:', error)
    }
  }

  // Validate and apply promo code
  static async validatePromoCode(code: string, userId: string): Promise<{
    valid: boolean
    discount: number
    promoCode?: PromoCode
  }> {
    try {
      // Check if promo code exists and is valid
      const promoCode = await prisma.$queryRaw<PromoCode[]>`
        SELECT * FROM promotions 
        WHERE code = ${code} 
        AND active = true 
        AND valid_from <= NOW() 
        AND valid_to >= NOW()
        AND current_uses < max_uses
        LIMIT 1
      `

      if (promoCode.length === 0) {
        return { valid: false, discount: 0 }
      }

      const promo = promoCode[0]
      let discount = 0

      if (promo.discountType === 'percentage') {
        discount = (promo.discount / 100) * 9.99 // Base premium price
      } else {
        discount = promo.discount
      }

      return {
        valid: true,
        discount: Math.round(discount * 100) / 100,
        promoCode: promo
      }
    } catch (error) {
      console.error('PaymentEngine: Error validating promo code:', error)
      return { valid: false, discount: 0 }
    }
  }

  // Create Stripe coupon for promo code
  private static async createStripeCoupon(promoCode: PromoCode): Promise<string> {
    try {
      const coupon = await stripe.coupons.create({
        id: `promo_${promoCode.code}_${Date.now()}`,
        name: `Promo: ${promoCode.code}`,
        percent_off: promoCode.discountType === 'percentage' ? promoCode.discount : undefined,
        amount_off: promoCode.discountType === 'fixed' ? promoCode.discount * 100 : undefined,
        currency: 'gbp',
        duration: 'once'
      })

      return coupon.id
    } catch (error) {
      console.error('PaymentEngine: Error creating Stripe coupon:', error)
      throw error
    }
  }

  // Increment promo code usage
  private static async incrementPromoCodeUsage(code: string): Promise<void> {
    try {
      await prisma.$executeRaw`
        UPDATE promotions 
        SET current_uses = current_uses + 1 
        WHERE code = ${code}
      `
    } catch (error) {
      console.error('PaymentEngine: Error incrementing promo code usage:', error)
    }
  }

  // Cancel subscription
  static async cancelSubscription(userId: string): Promise<{ success: boolean; message: string }> {
    try {
      // Find user's active subscription
      const user = await prisma.user.findUnique({
        where: { id: userId }
      })

      if (!user || user.subscriptionTier === 'Free') {
        return { success: false, message: 'No active subscription found' }
      }

      // Find Stripe subscription
      const subscriptions = await stripe.subscriptions.list({
        customer: user.email,
        status: 'active'
      })

      if (subscriptions.data.length > 0) {
        const subscription = subscriptions.data[0]
        
        // Cancel at period end to allow access until billing cycle ends
        await stripe.subscriptions.update(subscription.id, {
          cancel_at_period_end: true
        })

        console.log(`PaymentEngine: Subscription cancelled for user ${userId}`)
        return { success: true, message: 'Subscription will be cancelled at the end of the current billing period' }
      }

      return { success: false, message: 'No active subscription found' }
    } catch (error) {
      console.error('PaymentEngine: Error cancelling subscription:', error)
      return { success: false, message: 'Failed to cancel subscription' }
    }
  }

  // Get billing history
  static async getBillingHistory(userId: string): Promise<any[]> {
    try {
      const transactions = await prisma.transaction.findMany({
        where: { 
          userId,
          status: 'Success'
        },
        orderBy: { createdAt: 'desc' },
        take: 50
      })

      return transactions.map(transaction => ({
        id: transaction.id,
        date: transaction.createdAt,
        amount: transaction.amount,
        currency: transaction.currency,
        plan: transaction.subscriptionPlan,
        method: transaction.paymentMethod,
        status: transaction.status
      }))
    } catch (error) {
      console.error('PaymentEngine: Error getting billing history:', error)
      return []
    }
  }

  // Generate invoice PDF
  static async generateInvoicePDF(transactionId: string): Promise<string> {
    try {
      // In production, this would use a PDF generation library like puppeteer or jsPDF
      const transaction = await prisma.transaction.findUnique({
        where: { id: transactionId },
        include: { user: true }
      })

      if (!transaction) {
        throw new Error('Transaction not found')
      }

      // For now, return a placeholder URL
      const invoiceUrl = `${process.env.FRONTEND_URL}/api/invoices/${transactionId}.pdf`
      
      console.log(`PaymentEngine: Generated invoice for transaction ${transactionId}`)
      return invoiceUrl
    } catch (error) {
      console.error('PaymentEngine: Error generating invoice PDF:', error)
      throw error
    }
  }

  // Get subscription status
  static async getSubscriptionStatus(userId: string): Promise<{
    tier: string
    status: string
    nextBilling?: Date
    cancelAtPeriodEnd?: boolean
  }> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      })

      if (!user) {
        throw new Error('User not found')
      }

      const result = {
        tier: user.subscriptionTier,
        status: user.subscriptionStatus
      }

      // Get additional details from Stripe if user has active subscription
      if (user.subscriptionTier !== 'Free') {
        try {
          const subscriptions = await stripe.subscriptions.list({
            customer: user.email,
            status: 'active'
          })

          if (subscriptions.data.length > 0) {
            const subscription = subscriptions.data[0]
            return {
              ...result,
              nextBilling: new Date(subscription.current_period_end * 1000),
              cancelAtPeriodEnd: subscription.cancel_at_period_end
            }
          }
        } catch (stripeError) {
          console.error('PaymentEngine: Error fetching Stripe subscription:', stripeError)
        }
      }

      return result
    } catch (error) {
      console.error('PaymentEngine: Error getting subscription status:', error)
      throw error
    }
  }
}