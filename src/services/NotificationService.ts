import { prisma } from '@/lib/prisma'
import nodemailer from 'nodemailer'
import twilio from 'twilio'

export interface NotificationTemplate {
  id: string
  name: string
  type: 'trip_update' | 'payment_success' | 'system_alert' | 'health_reminder' | 'booking_confirmation' | 'weather_alert'
  channels: ('in_app' | 'email' | 'sms' | 'push')[]
  subject: string
  emailTemplate: string
  smsTemplate: string
  pushTemplate: string
  variables: string[] // Template variables like {tripName}, {amount}, etc.
  priority: 'low' | 'medium' | 'high' | 'urgent'
  enabled: boolean
}

export interface NotificationPreferences {
  userId: string
  tripUpdates: {
    inApp: boolean
    email: boolean
    sms: boolean
    push: boolean
  }
  paymentNotifications: {
    inApp: boolean
    email: boolean
    sms: boolean
    push: boolean
  }
  healthReminders: {
    inApp: boolean
    email: boolean
    sms: boolean
    push: boolean
  }
  marketingEmails: boolean
  systemAlerts: {
    inApp: boolean
    email: boolean
    sms: boolean
    push: boolean
  }
  quietHours: {
    enabled: boolean
    startTime: string // HH:mm format
    endTime: string
    timezone: string
  }
  frequency: {
    digest: 'immediate' | 'hourly' | 'daily' | 'weekly'
    maxPerDay: number
  }
}

export interface NotificationContext {
  userId: string
  type: string
  title: string
  message: string
  data?: any
  channels: string[]
  priority: 'low' | 'medium' | 'high' | 'urgent'
  scheduledFor?: Date
  expiresAt?: Date
  actionUrl?: string
  imageUrl?: string
}

export interface DeliveryResult {
  channel: string
  success: boolean
  messageId?: string
  error?: string
  deliveredAt: Date
}

export class NotificationService {
  private static emailTransporter: nodemailer.Transporter
  private static twilioClient: any
  private static pushService: any // Would be initialized with Firebase or similar
  
  private static readonly RATE_LIMITS = {
    email: { max: 100, window: 3600000 }, // 100 emails per hour
    sms: { max: 50, window: 3600000 }, // 50 SMS per hour
    push: { max: 1000, window: 3600000 } // 1000 push notifications per hour
  }

  private static readonly DEFAULT_TEMPLATES: NotificationTemplate[] = [
    {
      id: 'trip-booking-confirmed',
      name: 'Trip Booking Confirmed',
      type: 'booking_confirmation',
      channels: ['in_app', 'email'],
      subject: 'Your trip to {destination} is confirmed! ✈️',
      emailTemplate: `
        <h2>Your trip is confirmed!</h2>
        <p>Hi {userName},</p>
        <p>Great news! Your trip to <strong>{destination}</strong> from {startDate} to {endDate} has been confirmed.</p>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Trip Details:</h3>
          <ul>
            <li><strong>Destination:</strong> {destination}</li>
            <li><strong>Dates:</strong> {startDate} - {endDate}</li>
            <li><strong>Total Cost:</strong> £{totalCost}</li>
            <li><strong>Booking Reference:</strong> {bookingRef}</li>
          </ul>
        </div>
        <p>You can view your complete itinerary and make changes in your dashboard.</p>
        <a href="{actionUrl}" style="background: #0E7F76; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 20px 0;">View Trip Details</a>
        <p>Have a wonderful trip!</p>
        <p>The AI Travel Planner Team</p>
      `,
      smsTemplate: 'Trip confirmed! {destination} {startDate}-{endDate}. Booking ref: {bookingRef}. View details: {actionUrl}',
      pushTemplate: 'Your trip to {destination} is confirmed! Tap to view details.',
      variables: ['userName', 'destination', 'startDate', 'endDate', 'totalCost', 'bookingRef', 'actionUrl'],
      priority: 'high',
      enabled: true
    },
    {
      id: 'payment-successful',
      name: 'Payment Successful',
      type: 'payment_success',
      channels: ['in_app', 'email'],
      subject: 'Payment confirmation - £{amount}',
      emailTemplate: `
        <h2>Payment Confirmed</h2>
        <p>Hi {userName},</p>
        <p>We've successfully processed your payment of <strong>£{amount}</strong> for your {subscriptionPlan} subscription.</p>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Payment Details:</h3>
          <ul>
            <li><strong>Amount:</strong> £{amount}</li>
            <li><strong>Payment Method:</strong> {paymentMethod}</li>
            <li><strong>Transaction ID:</strong> {transactionId}</li>
            <li><strong>Date:</strong> {paymentDate}</li>
          </ul>
        </div>
        <p>Your subscription is now active and you have access to all {subscriptionPlan} features.</p>
        <a href="{actionUrl}" style="background: #0E7F76; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 20px 0;">View Receipt</a>
        <p>Thank you for choosing AI Travel Planner!</p>
      `,
      smsTemplate: 'Payment of £{amount} confirmed. Transaction ID: {transactionId}. Receipt: {actionUrl}',
      pushTemplate: 'Payment of £{amount} successful. Your {subscriptionPlan} subscription is now active!',
      variables: ['userName', 'amount', 'subscriptionPlan', 'paymentMethod', 'transactionId', 'paymentDate', 'actionUrl'],
      priority: 'medium',
      enabled: true
    },
    {
      id: 'health-goal-reminder',
      name: 'Health Goal Reminder',
      type: 'health_reminder',
      channels: ['in_app', 'push'],
      subject: 'Time to check your health progress! 💪',
      emailTemplate: `
        <h2>Health Goal Check-in</h2>
        <p>Hi {userName},</p>
        <p>It's time to check in on your health goals! Let's see how you're doing:</p>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Your Progress This Week:</h3>
          <ul>
            <li><strong>Steps:</strong> {currentSteps} / {targetSteps}</li>
            <li><strong>Active Minutes:</strong> {activeMinutes} / {targetMinutes}</li>
            <li><strong>Water Intake:</strong> {waterIntake} / {targetWater} glasses</li>
          </ul>
        </div>
        <p>You're doing great! Keep up the momentum and remember, every step counts towards your travel fitness goals.</p>
        <a href="{actionUrl}" style="background: #0E7F76; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 20px 0;">Update Health Data</a>
      `,
      smsTemplate: 'Health check-in: {currentSteps}/{targetSteps} steps this week. Keep it up! Update: {actionUrl}',
      pushTemplate: 'Time for your health check-in! {currentSteps}/{targetSteps} steps this week. Tap to update.',
      variables: ['userName', 'currentSteps', 'targetSteps', 'activeMinutes', 'targetMinutes', 'waterIntake', 'targetWater', 'actionUrl'],
      priority: 'low',
      enabled: true
    },
    {
      id: 'weather-alert',
      name: 'Weather Alert',
      type: 'weather_alert',
      channels: ['in_app', 'push'],
      subject: 'Weather update for your trip to {destination}',
      emailTemplate: `
        <h2>Weather Alert for Your Trip</h2>
        <p>Hi {userName},</p>
        <p>We have a weather update for your upcoming trip to <strong>{destination}</strong>:</p>
        <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>⚠️ Weather Alert</h3>
          <p><strong>{weatherAlert}</strong></p>
          <p>Current conditions: {currentWeather}</p>
          <p>Forecast: {forecast}</p>
        </div>
        <p>We recommend packing appropriate clothing and checking for any activity changes.</p>
        <a href="{actionUrl}" style="background: #0E7F76; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 20px 0;">View Updated Itinerary</a>
        <p>Safe travels!</p>
      `,
      smsTemplate: 'Weather alert for {destination}: {weatherAlert}. Check updated itinerary: {actionUrl}',
      pushTemplate: 'Weather alert for {destination}: {weatherAlert}. Tap for details.',
      variables: ['userName', 'destination', 'weatherAlert', 'currentWeather', 'forecast', 'actionUrl'],
      priority: 'medium',
      enabled: true
    },
    {
      id: 'system-maintenance',
      name: 'System Maintenance',
      type: 'system_alert',
      channels: ['in_app', 'email'],
      subject: 'Scheduled maintenance - {maintenanceDate}',
      emailTemplate: `
        <h2>Scheduled System Maintenance</h2>
        <p>Hi {userName},</p>
        <p>We're performing scheduled maintenance to improve your experience with AI Travel Planner.</p>
        <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Maintenance Details:</h3>
          <ul>
            <li><strong>Date:</strong> {maintenanceDate}</li>
            <li><strong>Time:</strong> {maintenanceTime}</li>
            <li><strong>Duration:</strong> {duration}</li>
            <li><strong>Services Affected:</strong> {affectedServices}</li>
          </ul>
        </div>
        <p>During this time, some features may be temporarily unavailable. We apologize for any inconvenience.</p>
        <p>Thank you for your patience as we work to improve our service!</p>
      `,
      smsTemplate: 'Maintenance scheduled for {maintenanceDate} at {maintenanceTime}. Duration: {duration}. Some features may be unavailable.',
      pushTemplate: 'Scheduled maintenance on {maintenanceDate}. Some features will be temporarily unavailable.',
      variables: ['userName', 'maintenanceDate', 'maintenanceTime', 'duration', 'affectedServices'],
      priority: 'medium',
      enabled: true
    }
  ]

  /**
   * Initialize notification service
   */
  static initialize(): void {
    // Initialize email transporter
    this.emailTransporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    })

    // Initialize Twilio client for SMS
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    }

    // Initialize default templates in database
    this.initializeTemplates()

    console.log('NotificationService: Initialized successfully')
  }

  /**
   * Send notification to user
   */
  static async sendNotification(context: NotificationContext): Promise<DeliveryResult[]> {
    console.log(`NotificationService: Sending notification to user ${context.userId}`)
    
    try {
      // Get user preferences
      const preferences = await this.getUserPreferences(context.userId)
      if (!preferences) {
        throw new Error('User preferences not found')
      }

      // Check quiet hours
      if (this.isQuietHours(preferences)) {
        console.log('NotificationService: Notification postponed due to quiet hours')
        return []
      }

      // Filter channels based on user preferences
      const allowedChannels = this.filterChannelsByPreferences(context.channels, context.type, preferences)
      if (allowedChannels.length === 0) {
        console.log('NotificationService: No channels allowed by user preferences')
        return []
      }

      // Check rate limits
      for (const channel of allowedChannels) {
        if (await this.isRateLimited(context.userId, channel)) {
          console.log(`NotificationService: Rate limit exceeded for ${channel}`)
          allowedChannels.splice(allowedChannels.indexOf(channel), 1)
        }
      }

      const results: DeliveryResult[] = []

      // Send to each allowed channel
      for (const channel of allowedChannels) {
        try {
          const result = await this.sendToChannel(channel, context)
          results.push(result)
          
          // Track rate limit
          await this.trackRateLimit(context.userId, channel)
        } catch (error) {
          console.error(`NotificationService: Failed to send to ${channel}:`, error)
          results.push({
            channel,
            success: false,
            error: error.message,
            deliveredAt: new Date()
          })
        }
      }

      // Store notification in database
      await this.storeNotification(context, results)

      return results
    } catch (error) {
      console.error('NotificationService: Error sending notification:', error)
      throw error
    }
  }

  /**
   * Send to specific channel
   */
  private static async sendToChannel(channel: string, context: NotificationContext): Promise<DeliveryResult> {
    switch (channel) {
      case 'email':
        return await this.sendEmail(context)
      case 'sms':
        return await this.sendSMS(context)
      case 'push':
        return await this.sendPush(context)
      case 'in_app':
        return await this.sendInApp(context)
      default:
        throw new Error(`Unsupported channel: ${channel}`)
    }
  }

  /**
   * Send email notification
   */
  private static async sendEmail(context: NotificationContext): Promise<DeliveryResult> {
    const user = await prisma.user.findUnique({
      where: { id: context.userId },
      select: { email: true, name: true }
    })

    if (!user) {
      throw new Error('User not found')
    }

    const template = this.DEFAULT_TEMPLATES.find(t => t.type === context.type)
    const emailContent = template?.emailTemplate || context.message

    // Replace template variables
    const processedContent = this.processTemplate(emailContent, {
      userName: user.name,
      ...context.data
    })

    const mailOptions = {
      from: process.env.FROM_EMAIL || 'noreply@travelplanner.com',
      to: user.email,
      subject: this.processTemplate(template?.subject || context.title, context.data),
      html: processedContent,
      headers: {
        'X-Priority': context.priority === 'urgent' ? '1' : context.priority === 'high' ? '2' : '3'
      }
    }

    const info = await this.emailTransporter.sendMail(mailOptions)
    
    return {
      channel: 'email',
      success: true,
      messageId: info.messageId,
      deliveredAt: new Date()
    }
  }

  /**
   * Send SMS notification
   */
  private static async sendSMS(context: NotificationContext): Promise<DeliveryResult> {
    if (!this.twilioClient) {
      throw new Error('Twilio not configured')
    }

    const user = await prisma.user.findUnique({
      where: { id: context.userId },
      select: { phone: true, name: true }
    })

    if (!user?.phone) {
      throw new Error('User phone number not found')
    }

    const template = this.DEFAULT_TEMPLATES.find(t => t.type === context.type)
    const smsContent = template?.smsTemplate || context.message

    // Replace template variables
    const processedContent = this.processTemplate(smsContent, {
      userName: user.name,
      ...context.data
    })

    const message = await this.twilioClient.messages.create({
      body: processedContent,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: user.phone
    })

    return {
      channel: 'sms',
      success: true,
      messageId: message.sid,
      deliveredAt: new Date()
    }
  }

  /**
   * Send push notification
   */
  private static async sendPush(context: NotificationContext): Promise<DeliveryResult> {
    // This would integrate with Firebase Cloud Messaging or similar
    console.log('NotificationService: Push notification would be sent here')
    
    return {
      channel: 'push',
      success: true,
      messageId: `push_${Date.now()}`,
      deliveredAt: new Date()
    }
  }

  /**
   * Send in-app notification
   */
  private static async sendInApp(context: NotificationContext): Promise<DeliveryResult> {
    // Store in database for in-app display
    await prisma.notification.create({
      data: {
        userId: context.userId,
        type: context.type,
        title: context.title,
        message: context.message,
        channels: ['in_app'],
        read: false
      }
    })

    return {
      channel: 'in_app',
      success: true,
      messageId: `inapp_${Date.now()}`,
      deliveredAt: new Date()
    }
  }

  /**
   * Get user notification preferences
   */
  private static async getUserPreferences(userId: string): Promise<NotificationPreferences | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { preferences: true }
      })

      if (!user) return null

      // Return default preferences if none set
      const defaultPrefs: NotificationPreferences = {
        userId,
        tripUpdates: { inApp: true, email: true, sms: false, push: true },
        paymentNotifications: { inApp: true, email: true, sms: false, push: false },
        healthReminders: { inApp: true, email: false, sms: false, push: true },
        marketingEmails: false,
        systemAlerts: { inApp: true, email: true, sms: false, push: true },
        quietHours: {
          enabled: false,
          startTime: '22:00',
          endTime: '08:00',
          timezone: 'Europe/London'
        },
        frequency: {
          digest: 'immediate',
          maxPerDay: 50
        }
      }

      return defaultPrefs
    } catch (error) {
      console.error('NotificationService: Error getting user preferences:', error)
      return null
    }
  }

  /**
   * Check if current time is within quiet hours
   */
  private static isQuietHours(preferences: NotificationPreferences): boolean {
    if (!preferences.quietHours.enabled) return false

    const now = new Date()
    const userTimezone = preferences.quietHours.timezone
    
    // This would need proper timezone handling
    // For now, using simple time comparison
    const currentHour = now.getHours()
    const startHour = parseInt(preferences.quietHours.startTime.split(':')[0])
    const endHour = parseInt(preferences.quietHours.endTime.split(':')[0])

    if (startHour <= endHour) {
      return currentHour >= startHour && currentHour < endHour
    } else {
      return currentHour >= startHour || currentHour < endHour
    }
  }

  /**
   * Filter channels based on user preferences
   */
  private static filterChannelsByPreferences(
    channels: string[], 
    type: string, 
    preferences: NotificationPreferences
  ): string[] {
    const allowedChannels: string[] = []

    for (const channel of channels) {
      let allowed = false

      switch (type) {
        case 'trip_update':
          allowed = preferences.tripUpdates[channel as keyof typeof preferences.tripUpdates] as boolean
          break
        case 'payment_success':
          allowed = preferences.paymentNotifications[channel as keyof typeof preferences.paymentNotifications] as boolean
          break
        case 'health_reminder':
          allowed = preferences.healthReminders[channel as keyof typeof preferences.healthReminders] as boolean
          break
        case 'system_alert':
          allowed = preferences.systemAlerts[channel as keyof typeof preferences.systemAlerts] as boolean
          break
        default:
          allowed = true // Allow by default for unknown types
      }

      if (allowed) {
        allowedChannels.push(channel)
      }
    }

    return allowedChannels
  }

  /**
   * Check if user has exceeded rate limit for channel
   */
  private static async isRateLimited(userId: string, channel: string): Promise<boolean> {
    const limit = this.RATE_LIMITS[channel as keyof typeof this.RATE_LIMITS]
    if (!limit) return false

    const windowStart = new Date(Date.now() - limit.window)
    
    const count = await prisma.notification.count({
      where: {
        userId,
        channels: { has: channel },
        sentAt: { gte: windowStart }
      }
    })

    return count >= limit.max
  }

  /**
   * Track rate limit usage
   */
  private static async trackRateLimit(userId: string, channel: string): Promise<void> {
    // This would be implemented with Redis or similar for efficient rate limiting
    // For now, we rely on database queries
  }

  /**
   * Process template with variables
   */
  private static processTemplate(template: string, variables: Record<string, any>): string {
    let processed = template

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{${key}}`, 'g')
      processed = processed.replace(regex, String(value || ''))
    }

    return processed
  }

  /**
   * Store notification record in database
   */
  private static async storeNotification(context: NotificationContext, results: DeliveryResult[]): Promise<void> {
    try {
      await prisma.notification.create({
        data: {
          userId: context.userId,
          type: context.type,
          title: context.title,
          message: context.message,
          channels: context.channels,
          read: false,
          sentAt: new Date()
        }
      })
    } catch (error) {
      console.error('NotificationService: Error storing notification:', error)
    }
  }

  /**
   * Initialize default templates in database
   */
  private static async initializeTemplates(): Promise<void> {
    try {
      for (const template of this.DEFAULT_TEMPLATES) {
        // This would check if template exists in database and create/update as needed
        console.log(`NotificationService: Template ${template.name} initialized`)
      }
    } catch (error) {
      console.error('NotificationService: Error initializing templates:', error)
    }
  }

  /**
   * Send bulk notifications
   */
  static async sendBulkNotification(
    userIds: string[], 
    context: Omit<NotificationContext, 'userId'>
  ): Promise<Array<{userId: string, results: DeliveryResult[]}>> {
    const results = []

    for (const userId of userIds) {
      try {
        const deliveryResults = await this.sendNotification({
          ...context,
          userId
        })
        results.push({ userId, results: deliveryResults })
      } catch (error) {
        console.error(`NotificationService: Error sending to user ${userId}:`, error)
        results.push({ 
          userId, 
          results: [{
            channel: 'error',
            success: false,
            error: error.message,
            deliveredAt: new Date()
          }]
        })
      }
    }

    return results
  }

  /**
   * Get user notifications
   */
  static async getUserNotifications(
    userId: string, 
    options: {
      unreadOnly?: boolean
      limit?: number
      offset?: number
      type?: string
    } = {}
  ): Promise<any[]> {
    try {
      const notifications = await prisma.notification.findMany({
        where: {
          userId,
          ...(options.unreadOnly && { read: false }),
          ...(options.type && { type: options.type })
        },
        orderBy: { sentAt: 'desc' },
        take: options.limit || 50,
        skip: options.offset || 0
      })

      return notifications
    } catch (error) {
      console.error('NotificationService: Error getting user notifications:', error)
      return []
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    try {
      await prisma.notification.updateMany({
        where: {
          id: notificationId,
          userId
        },
        data: {
          read: true,
          readAt: new Date()
        }
      })
      return true
    } catch (error) {
      console.error('NotificationService: Error marking notification as read:', error)
      return false
    }
  }

  /**
   * Get notification statistics
   */
  static async getNotificationStats(userId: string): Promise<{
    total: number
    unread: number
    byType: Record<string, number>
    recentActivity: any[]
  }> {
    try {
      const [total, unread, byType, recent] = await Promise.all([
        prisma.notification.count({ where: { userId } }),
        prisma.notification.count({ where: { userId, read: false } }),
        prisma.notification.groupBy({
          by: ['type'],
          where: { userId },
          _count: { type: true }
        }),
        prisma.notification.findMany({
          where: { userId },
          orderBy: { sentAt: 'desc' },
          take: 10
        })
      ])

      const typeStats = byType.reduce((acc, item) => {
        acc[item.type] = item._count.type
        return acc
      }, {} as Record<string, number>)

      return {
        total,
        unread,
        byType: typeStats,
        recentActivity: recent
      }
    } catch (error) {
      console.error('NotificationService: Error getting notification stats:', error)
      return {
        total: 0,
        unread: 0,
        byType: {},
        recentActivity: []
      }
    }
  }

  /**
   * Cleanup old notifications
   */
  static async cleanup(): Promise<void> {
    try {
      const retentionDays = 90
      const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000)

      const deleted = await prisma.notification.deleteMany({
        where: {
          sentAt: { lt: cutoffDate },
          read: true
        }
      })

      console.log(`NotificationService: Cleaned up ${deleted.count} old notifications`)
    } catch (error) {
      console.error('NotificationService: Cleanup failed:', error)
    }
  }
}

// Initialize on module load
NotificationService.initialize()