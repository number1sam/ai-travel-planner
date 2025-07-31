import { NextRequest, NextResponse } from 'next/server'

export function withRateLimit(handler: (req: NextRequest) => Promise<NextResponse>) {
  return async (req: NextRequest) => {
    // For now, just pass through - add actual rate limiting later
    return handler(req)
  }
}

export function validateCSRF(req: NextRequest): boolean {
  // Placeholder CSRF validation
  return true
}