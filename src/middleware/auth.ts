import { NextRequest, NextResponse } from 'next/server'

export function requireAuth(handler: (req: NextRequest) => Promise<NextResponse>) {
  return async (req: NextRequest) => {
    // For now, just pass through - add actual auth logic later
    return handler(req)
  }
}

export function isAuthenticated(req: NextRequest): boolean {
  // Placeholder auth check
  return true
}