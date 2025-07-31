import { prisma } from '@/lib/prisma'
import { EncryptionService, FieldEncryption } from '@/lib/encryption'
import { sendEmail } from '@/services/EmailService'

export interface DataExportRequest {
  userId: string
  email: string
  requestDate: Date
  status: 'pending' | 'processing' | 'completed' | 'failed'
  downloadUrl?: string
}

export interface DataDeletionRequest {
  userId: string
  email: string
  requestDate: Date
  scheduledDeletion: Date
  status: 'pending' | 'approved' | 'deleted' | 'cancelled'
  reason?: string
}

export interface ConsentRecord {
  userId: string
  consentType: string
  granted: boolean
  timestamp: Date
  ipAddress: string
  userAgent: string
  version: string
}

export class GDPRService {
  private static readonly DATA_RETENTION_DAYS = 2555 // 7 years for financial data
  private static readonly DELETION_GRACE_PERIOD_DAYS = 30

  /**
   * Records user consent for data processing
   */
  static async recordConsent(data: {
    userId: string
    consentType: 'marketing' | 'analytics' | 'essential' | 'personalization'
    granted: boolean
    ipAddress: string
    userAgent: string
  }): Promise<void> {
    try {
      await prisma.consentLog.create({
        data: {
          userId: data.userId,
          consentType: data.consentType,
          granted: data.granted,
          timestamp: new Date(),
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          version: '1.0'
        }
      })

      // Update user preferences
      await prisma.user.update({
        where: { id: data.userId },
        data: {
          [`consent${data.consentType.charAt(0).toUpperCase() + data.consentType.slice(1)}`]: data.granted,
          consentLastUpdated: new Date()
        }
      })

      console.log(`GDPRService: Consent recorded for user ${data.userId}: ${data.consentType} = ${data.granted}`)
    } catch (error) {
      console.error('GDPRService: Error recording consent:', error)
      throw error
    }
  }

  /**
   * Processes data export request (Right to Data Portability)
   */
  static async requestDataExport(userId: string): Promise<DataExportRequest> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      })

      if (!user) {
        throw new Error('User not found')
      }

      // Create export request record
      const exportRequest = await prisma.dataExportRequest.create({
        data: {
          userId,
          email: user.email,
          requestDate: new Date(),
          status: 'pending'
        }
      })

      // Process export in background
      setImmediate(() => this.processDataExport(exportRequest.id))

      // Send confirmation email
      await sendEmail({
        to: user.email,
        subject: 'Data Export Request Received - AI Travel Planner',
        template: 'data_export_request',
        data: {
          userName: user.name,
          requestId: exportRequest.id,
          estimatedCompletion: '72 hours'
        }
      })

      console.log(`GDPRService: Data export requested for user ${userId}`)

      return {
        userId,
        email: user.email,
        requestDate: exportRequest.requestDate,
        status: 'pending'
      }
    } catch (error) {
      console.error('GDPRService: Error requesting data export:', error)
      throw error
    }
  }

  /**
   * Processes the actual data export
   */
  private static async processDataExport(requestId: string): Promise<void> {
    try {
      // Update status to processing
      await prisma.dataExportRequest.update({
        where: { id: requestId },
        data: { status: 'processing' }
      })

      const request = await prisma.dataExportRequest.findUnique({
        where: { id: requestId }
      })

      if (!request) return

      // Collect all user data
      const userData = await this.collectUserData(request.userId)

      // Generate export file
      const exportData = {
        exportDate: new Date().toISOString(),
        requestId: requestId,
        userId: request.userId,
        personalData: userData.personalData,
        travelData: userData.travelData,
        healthData: userData.healthData,
        paymentData: userData.paymentData,
        activityLogs: userData.activityLogs,
        consentHistory: userData.consentHistory
      }

      // In production, this would be saved to secure cloud storage
      const exportJson = JSON.stringify(exportData, null, 2)
      const fileName = `user_data_export_${request.userId}_${Date.now()}.json`
      const downloadUrl = `${process.env.FRONTEND_URL}/api/data-export/${fileName}`

      // Update request with download URL
      await prisma.dataExportRequest.update({
        where: { id: requestId },
        data: {
          status: 'completed',
          downloadUrl: downloadUrl
        }
      })

      // Send completion email
      const user = await prisma.user.findUnique({ where: { id: request.userId } })
      if (user) {
        await sendEmail({
          to: user.email,
          subject: 'Your Data Export is Ready - AI Travel Planner',
          template: 'data_export_complete',
          data: {
            userName: user.name,
            downloadUrl: downloadUrl,
            expirationDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString() // 7 days
          }
        })
      }

      console.log(`GDPRService: Data export completed for request ${requestId}`)
    } catch (error) {
      console.error('GDPRService: Error processing data export:', error)

      // Update status to failed
      await prisma.dataExportRequest.update({
        where: { id: requestId },
        data: { status: 'failed' }
      })
    }
  }

  /**
   * Collects all user data for export
   */
  private static async collectUserData(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        trips: true,
        healthMetrics: true,
        transactions: true
      }
    })

    if (!user) throw new Error('User not found')

    // Decrypt sensitive fields
    const decryptedUser = await FieldEncryption.decryptFields(user)

    return {
      personalData: {
        id: user.id,
        name: user.name,
        email: user.email,
        dateOfBirth: user.dateOfBirth,
        nationality: user.nationality,
        phoneNumber: decryptedUser.phoneNumber,
        address: decryptedUser.address,
        emergencyContact: decryptedUser.emergencyContact,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        subscriptionTier: user.subscriptionTier,
        preferences: user.travelPreferences
      },
      travelData: {
        trips: user.trips.map(trip => ({
          id: trip.id,
          destination: trip.destination,
          startDate: trip.startDate,
          endDate: trip.endDate,
          budget: trip.budget,
          currency: trip.currency,
          status: trip.status,
          itinerary: trip.itinerary,
          createdAt: trip.createdAt
        }))
      },
      healthData: {
        metrics: user.healthMetrics.map(metric => ({
          id: metric.id,
          type: metric.type,
          value: metric.value,
          unit: metric.unit,
          recordedAt: metric.recordedAt,
          source: metric.source
        })),
        conditions: decryptedUser.medicalConditions,
        allergies: decryptedUser.allergies
      },
      paymentData: {
        transactions: user.transactions.map(transaction => ({
          id: transaction.id,
          amount: transaction.amount,
          currency: transaction.currency,
          status: transaction.status,
          paymentMethod: transaction.paymentMethod,
          subscriptionPlan: transaction.subscriptionPlan,
          createdAt: transaction.createdAt
        }))
      },
      activityLogs: await prisma.auditLog.findMany({
        where: { userId },
        orderBy: { timestamp: 'desc' },
        take: 1000
      }),
      consentHistory: await prisma.consentLog.findMany({
        where: { userId },
        orderBy: { timestamp: 'desc' }
      })
    }
  }

  /**
   * Requests account deletion (Right to be Forgotten)
   */
  static async requestDataDeletion(userId: string, reason?: string): Promise<DataDeletionRequest> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      })

      if (!user) {
        throw new Error('User not found')
      }

      const scheduledDeletion = new Date()
      scheduledDeletion.setDate(scheduledDeletion.getDate() + this.DELETION_GRACE_PERIOD_DAYS)

      // Create deletion request
      const deletionRequest = await prisma.dataDeletionRequest.create({
        data: {
          userId,
          email: user.email,
          requestDate: new Date(),
          scheduledDeletion,
          status: 'pending',
          reason
        }
      })

      // Send confirmation email
      await sendEmail({
        to: user.email,
        subject: 'Account Deletion Request Received - AI Travel Planner',
        template: 'data_deletion_request',
        data: {
          userName: user.name,
          requestId: deletionRequest.id,
          scheduledDate: scheduledDeletion.toLocaleDateString(),
          gracePeriod: this.DELETION_GRACE_PERIOD_DAYS,
          cancelUrl: `${process.env.FRONTEND_URL}/account/deletion/cancel/${deletionRequest.id}`
        }
      })

      console.log(`GDPRService: Data deletion requested for user ${userId}`)

      return {
        userId,
        email: user.email,
        requestDate: deletionRequest.requestDate,
        scheduledDeletion,
        status: 'pending',
        reason
      }
    } catch (error) {
      console.error('GDPRService: Error requesting data deletion:', error)
      throw error
    }
  }

  /**
   * Cancels a pending data deletion request
   */
  static async cancelDataDeletion(requestId: string): Promise<void> {
    try {
      const request = await prisma.dataDeletionRequest.findUnique({
        where: { id: requestId }
      })

      if (!request) {
        throw new Error('Deletion request not found')
      }

      if (request.status !== 'pending') {
        throw new Error('Cannot cancel deletion request in current status')
      }

      await prisma.dataDeletionRequest.update({
        where: { id: requestId },
        data: { status: 'cancelled' }
      })

      // Send cancellation confirmation
      const user = await prisma.user.findUnique({ where: { id: request.userId } })
      if (user) {
        await sendEmail({
          to: user.email,
          subject: 'Account Deletion Cancelled - AI Travel Planner',
          template: 'data_deletion_cancelled',
          data: {
            userName: user.name,
            cancellationDate: new Date().toLocaleDateString()
          }
        })
      }

      console.log(`GDPRService: Data deletion cancelled for request ${requestId}`)
    } catch (error) {
      console.error('GDPRService: Error cancelling data deletion:', error)
      throw error
    }
  }

  /**
   * Executes scheduled data deletions
   */
  static async processScheduledDeletions(): Promise<void> {
    try {
      const pendingDeletions = await prisma.dataDeletionRequest.findMany({
        where: {
          status: 'pending',
          scheduledDeletion: {
            lte: new Date()
          }
        }
      })

      for (const deletion of pendingDeletions) {
        await this.executeDataDeletion(deletion.userId, deletion.id)
      }

      console.log(`GDPRService: Processed ${pendingDeletions.length} scheduled deletions`)
    } catch (error) {
      console.error('GDPRService: Error processing scheduled deletions:', error)
    }
  }

  /**
   * Executes the actual data deletion
   */
  private static async executeDataDeletion(userId: string, requestId: string): Promise<void> {
    try {
      // Start transaction for atomic deletion
      await prisma.$transaction(async (tx) => {
        // Delete user data in order (respecting foreign key constraints)
        await tx.healthMetrics.deleteMany({ where: { userId } })
        await tx.tripActivity.deleteMany({ where: { trip: { userId } } })
        await tx.trip.deleteMany({ where: { userId } })
        await tx.transaction.deleteMany({ where: { userId } })
        await tx.consentLog.deleteMany({ where: { userId } })
        await tx.auditLog.deleteMany({ where: { userId } })
        await tx.dataExportRequest.deleteMany({ where: { userId } })
        
        // Anonymize user record (keep for audit/compliance)
        await tx.user.update({
          where: { id: userId },
          data: {
            name: '[DELETED]',
            email: `deleted_${Date.now()}@deleted.com`,
            phoneNumber: null,
            dateOfBirth: null,
            nationality: null,
            address: null,
            emergencyContact: null,
            medicalConditions: null,
            allergies: null,
            travelPreferences: null,
            lastLogin: null,
            subscriptionTier: 'Free',
            subscriptionStatus: 'cancelled',
            deletedAt: new Date()
          }
        })

        // Update deletion request status
        await tx.dataDeletionRequest.update({
          where: { id: requestId },
          data: { status: 'deleted' }
        })
      })

      console.log(`GDPRService: Data deletion completed for user ${userId}`)
    } catch (error) {
      console.error('GDPRService: Error executing data deletion:', error)
      throw error
    }
  }

  /**
   * Gets user's current consent status
   */
  static async getConsentStatus(userId: string): Promise<{
    marketing: boolean
    analytics: boolean
    essential: boolean
    personalization: boolean
  }> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          consentMarketing: true,
          consentAnalytics: true,
          consentEssential: true,
          consentPersonalization: true
        }
      })

      if (!user) {
        throw new Error('User not found')
      }

      return {
        marketing: user.consentMarketing ?? false,
        analytics: user.consentAnalytics ?? false,
        essential: user.consentEssential ?? true, // Always true for essential
        personalization: user.consentPersonalization ?? false
      }
    } catch (error) {
      console.error('GDPRService: Error getting consent status:', error)
      throw error
    }
  }

  /**
   * Updates user consent preferences
   */
  static async updateConsent(
    userId: string,
    consent: Partial<{
      marketing: boolean
      analytics: boolean
      personalization: boolean
    }>,
    ipAddress: string,
    userAgent: string
  ): Promise<void> {
    try {
      // Record each consent change
      for (const [type, granted] of Object.entries(consent)) {
        await this.recordConsent({
          userId,
          consentType: type as any,
          granted: granted as boolean,
          ipAddress,
          userAgent
        })
      }

      console.log(`GDPRService: Consent updated for user ${userId}`)
    } catch (error) {
      console.error('GDPRService: Error updating consent:', error)
      throw error
    }
  }

  /**
   * Cleans up expired data based on retention policies
   */
  static async cleanupExpiredData(): Promise<void> {
    try {
      const expirationDate = new Date()
      expirationDate.setDate(expirationDate.getDate() - this.DATA_RETENTION_DAYS)

      // Delete old audit logs
      const deletedLogs = await prisma.auditLog.deleteMany({
        where: {
          timestamp: {
            lt: expirationDate
          }
        }
      })

      // Delete old consent logs (keep recent ones for compliance)
      const consentExpirationDate = new Date()
      consentExpirationDate.setFullYear(consentExpirationDate.getFullYear() - 3) // 3 years

      const deletedConsent = await prisma.consentLog.deleteMany({
        where: {
          timestamp: {
            lt: consentExpirationDate
          }
        }
      })

      // Delete completed export requests older than 30 days
      const exportExpirationDate = new Date()
      exportExpirationDate.setDate(exportExpirationDate.getDate() - 30)

      const deletedExports = await prisma.dataExportRequest.deleteMany({
        where: {
          status: 'completed',
          requestDate: {
            lt: exportExpirationDate
          }
        }
      })

      console.log(`GDPRService: Cleanup completed - Logs: ${deletedLogs.count}, Consent: ${deletedConsent.count}, Exports: ${deletedExports.count}`)
    } catch (error) {
      console.error('GDPRService: Error during data cleanup:', error)
    }
  }
}