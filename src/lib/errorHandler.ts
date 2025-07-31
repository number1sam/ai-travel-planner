import { NextResponse } from 'next/server'
import { logger } from './logger'
// Import Prisma only when needed to avoid Edge Runtime issues
// import { Prisma } from '@prisma/client'

export class AppError extends Error {
  public statusCode: number
  public code: string
  public isOperational: boolean
  public context?: any

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    isOperational: boolean = true,
    context?: any
  ) {
    super(message)
    this.name = this.constructor.name
    this.statusCode = statusCode
    this.code = code
    this.isOperational = isOperational
    this.context = context

    Error.captureStackTrace(this, this.constructor)
  }
}

// Specific error types
export class ValidationError extends AppError {
  constructor(message: string, field?: string) {
    super(message, 400, 'VALIDATION_ERROR', true, { field })
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR')
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR')
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND')
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT')
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED')
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, originalError?: Error) {
    super(
      `External service error: ${service}`,
      502,
      'EXTERNAL_SERVICE_ERROR',
      true,
      { service, originalError: originalError?.message }
    )
  }
}

export class DatabaseError extends AppError {
  constructor(operation: string, originalError?: Error) {
    super(
      `Database operation failed: ${operation}`,
      500,
      'DATABASE_ERROR',
      true,
      { operation, originalError: originalError?.message }
    )
  }
}

export class AIServiceError extends AppError {
  constructor(model: string, originalError?: Error) {
    super(
      `AI service error: ${model}`,
      503,
      'AI_SERVICE_ERROR',
      true,
      { model, originalError: originalError?.message }
    )
  }
}

export class PaymentError extends AppError {
  constructor(message: string, paymentId?: string) {
    super(message, 402, 'PAYMENT_ERROR', true, { paymentId })
  }
}

// Error handler middleware for API routes
export function handleApiError(
  error: Error,
  requestId?: string,
  userId?: string
): NextResponse {
  const context = {
    requestId,
    userId,
    service: 'api'
  }

  // Log the error
  logger.error('API Error', error, context)

  // Handle different error types
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: {
          message: error.message,
          code: error.code,
          ...(process.env.NODE_ENV === 'development' && {
            stack: error.stack,
            context: error.context
          })
        }
      },
      { status: error.statusCode }
    )
  }

  // Handle Prisma errors (simplified for Edge Runtime compatibility)
  if (error.name === 'PrismaClientKnownRequestError') {
    return handlePrismaError(error as any)
  }

  if (error.name === 'PrismaClientValidationError') {
    return NextResponse.json(
      {
        error: {
          message: 'Invalid data provided',
          code: 'VALIDATION_ERROR'
        }
      },
      { status: 400 }
    )
  }

  // Handle validation errors from external libraries
  if (error.name === 'ValidationError') {
    return NextResponse.json(
      {
        error: {
          message: error.message,
          code: 'VALIDATION_ERROR'
        }
      },
      { status: 400 }
    )
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    return NextResponse.json(
      {
        error: {
          message: 'Invalid token',
          code: 'INVALID_TOKEN'
        }
      },
      { status: 401 }
    )
  }

  if (error.name === 'TokenExpiredError') {
    return NextResponse.json(
      {
        error: {
          message: 'Token expired',
          code: 'TOKEN_EXPIRED'
        }
      },
      { status: 401 }
    )
  }

  // Handle network/timeout errors
  if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
    return NextResponse.json(
      {
        error: {
          message: 'Request timeout',
          code: 'TIMEOUT_ERROR'
        }
      },
      { status: 408 }
    )
  }

  // Handle rate limiting errors
  if (error.message.includes('rate limit') || error.message.includes('429')) {
    return NextResponse.json(
      {
        error: {
          message: 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED'
        }
      },
      { status: 429 }
    )
  }

  // Default internal server error
  return NextResponse.json(
    {
      error: {
        message: process.env.NODE_ENV === 'development' 
          ? error.message 
          : 'Internal server error',
        code: 'INTERNAL_ERROR',
        ...(process.env.NODE_ENV === 'development' && {
          stack: error.stack
        })
      }
    },
    { status: 500 }
  )
}

function handlePrismaError(error: any): NextResponse {
  switch (error.code) {
    case 'P2002':
      // Unique constraint violation
      const target = error.meta?.target as string[]
      return NextResponse.json(
        {
          error: {
            message: `Duplicate value for ${target?.join(', ') || 'field'}`,
            code: 'DUPLICATE_ERROR',
            field: target?.[0]
          }
        },
        { status: 409 }
      )

    case 'P2025':
      // Record not found
      return NextResponse.json(
        {
          error: {
            message: 'Record not found',
            code: 'NOT_FOUND'
          }
        },
        { status: 404 }
      )

    case 'P2003':
      // Foreign key constraint violation
      return NextResponse.json(
        {
          error: {
            message: 'Foreign key constraint violation',
            code: 'CONSTRAINT_VIOLATION'
          }
        },
        { status: 400 }
      )

    case 'P2014':
      // Invalid ID
      return NextResponse.json(
        {
          error: {
            message: 'Invalid ID provided',
            code: 'INVALID_ID'
          }
        },
        { status: 400 }
      )

    default:
      logger.error('Unhandled Prisma error', error)
      return NextResponse.json(
        {
          error: {
            message: 'Database error',
            code: 'DATABASE_ERROR'
          }
        },
        { status: 500 }
      )
  }
}

// Wrapper for async API handlers
export function withErrorHandling(
  handler: (request: Request, ...args: any[]) => Promise<Response>
) {
  return async (request: Request, ...args: any[]): Promise<Response> => {
    try {
      return await handler(request, ...args)
    } catch (error) {
      const requestId = request.headers.get('x-request-id') || undefined
      const userId = request.headers.get('x-user-id') || undefined
      return handleApiError(error as Error, requestId, userId)
    }
  }
}

// Circuit breaker for external services
export class CircuitBreaker {
  private failures = 0
  private lastFailureTime = 0
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED'

  constructor(
    private maxFailures = 5,
    private timeout = 60000, // 1 minute
    private resetTimeout = 30000 // 30 seconds
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'HALF_OPEN'
      } else {
        throw new ExternalServiceError('Circuit breaker is OPEN')
      }
    }

    try {
      const result = await Promise.race([
        fn(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), this.timeout)
        )
      ])

      // Success - reset circuit breaker
      if (this.state === 'HALF_OPEN') {
        this.state = 'CLOSED'
        this.failures = 0
      }

      return result
    } catch (error) {
      this.failures++
      this.lastFailureTime = Date.now()

      if (this.failures >= this.maxFailures) {
        this.state = 'OPEN'
      }

      throw error
    }
  }

  getState() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime
    }
  }

  reset() {
    this.state = 'CLOSED'
    this.failures = 0
    this.lastFailureTime = 0
  }
}

// Retry logic with exponential backoff
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000,
  maxDelay = 10000
): Promise<T> {
  let lastError: Error
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      
      if (attempt === maxRetries) {
        throw lastError
      }

      // Don't retry on certain errors
      if (error instanceof AuthenticationError ||
          error instanceof AuthorizationError ||
          error instanceof ValidationError) {
        throw error
      }

      // Calculate delay with exponential backoff and jitter
      const delay = Math.min(
        baseDelay * Math.pow(2, attempt) + Math.random() * 1000,
        maxDelay
      )

      logger.warn(`Retrying operation (attempt ${attempt + 1}/${maxRetries + 1})`, {
        error: error.message,
        delay,
        service: 'retry-handler'
      })

      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError!
}

// Global error handler for unhandled errors
export function setupGlobalErrorHandlers() {
  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', error, { service: 'global-handler' })
    
    // Graceful shutdown
    process.exit(1)
  })

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection', reason as Error, {
      service: 'global-handler',
      metadata: { promise: promise.toString() }
    })
  })

  // Handle SIGTERM and SIGINT for graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, starting graceful shutdown')
    // Implement graceful shutdown logic here
    process.exit(0)
  })

  process.on('SIGINT', () => {
    logger.info('SIGINT received, starting graceful shutdown')
    // Implement graceful shutdown logic here
    process.exit(0)
  })
}

// Error boundary for React components (if using SSR)
export class ErrorBoundary {
  static getDerivedStateFromError(error: Error) {
    logger.error('React Error Boundary', error, { service: 'react' })
    return { hasError: true, error }
  }

  static componentDidCatch(error: Error, errorInfo: any) {
    logger.error('React Component Error', error, {
      service: 'react',
      metadata: errorInfo
    })
  }
}

// All error classes are already exported individually above