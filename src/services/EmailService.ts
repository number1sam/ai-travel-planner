// Stub EmailService for development
export async function sendEmail(to: string, subject: string, body: string): Promise<boolean> {
  console.log('Email service not implemented:', { to, subject, body })
  return true
}

export class EmailService {
  static async sendEmail(to: string, subject: string, body: string): Promise<boolean> {
    return sendEmail(to, subject, body)
  }
  
  static async sendDeletionNotification(email: string): Promise<boolean> {
    console.log('Deletion notification not implemented:', email)
    return true
  }
  
  static async sendPaymentReceipt(email: string, amount: number): Promise<boolean> {
    console.log('Payment receipt not implemented:', { email, amount })
    return true
  }
}