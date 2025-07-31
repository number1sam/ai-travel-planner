// Simple logger for development (Edge Runtime compatible)
interface LogContext {
  [key: string]: any
}

class SimpleLogger {
  private formatMessage(level: string, message: string, error?: Error, context?: LogContext) {
    const timestamp = new Date().toISOString()
    const logEntry = {
      timestamp,
      level,
      message,
      ...(error && { 
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        }
      }),
      ...(context && { context })
    }
    
    return JSON.stringify(logEntry)
  }

  info(message: string, context?: LogContext) {
    console.log(this.formatMessage('info', message, undefined, context))
  }

  warn(message: string, context?: LogContext) {
    console.warn(this.formatMessage('warn', message, undefined, context))
  }

  error(message: string, error?: Error, context?: LogContext) {
    console.error(this.formatMessage('error', message, error, context))
  }

  debug(message: string, context?: LogContext) {
    if (process.env.NODE_ENV === 'development') {
      console.log(this.formatMessage('debug', message, undefined, context))
    }
  }

  logUserAction(userId: string, action: string, context?: LogContext) {
    this.info(`User action: ${action}`, {
      userId,
      action,
      ...context
    })
  }

  logAPICall(method: string, path: string, statusCode: number, duration: number, context?: LogContext) {
    this.info(`API Call: ${method} ${path} - ${statusCode}`, {
      method,
      path,
      statusCode,
      duration,
      ...context
    })
  }
}

export const logger = new SimpleLogger()