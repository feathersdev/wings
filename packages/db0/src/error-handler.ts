import { errors } from '@feathersjs/errors'

export const ERROR = Symbol.for('@wingshq/db0/error')

/**
 * Database-agnostic error handler for db0 adapter
 * Maps generic database error patterns to appropriate FeathersJS error types
 */
export function errorHandler(error: any) {
  const message = error.message || 'Database operation failed'
  let feathersError = error

  // Don't double-wrap FeathersJS errors
  if (error instanceof errors.FeathersError) {
    return error
  }

  const lowerMessage = message.toLowerCase()

  // Pattern-based error classification (database-agnostic)

  // Not Found patterns
  if (
    lowerMessage.includes('not found') ||
    lowerMessage.includes('no such table') ||
    lowerMessage.includes('no such column') ||
    lowerMessage.includes('does not exist') ||
    lowerMessage.includes('no record') ||
    lowerMessage.includes('no rows')
  ) {
    feathersError = new errors.NotFound(message)
  }
  // Constraint/Validation patterns (BadRequest)
  else if (
    lowerMessage.includes('constraint') ||
    lowerMessage.includes('violation') ||
    lowerMessage.includes('duplicate') ||
    lowerMessage.includes('unique') ||
    lowerMessage.includes('check constraint') ||
    lowerMessage.includes('foreign key') ||
    lowerMessage.includes('invalid input') ||
    lowerMessage.includes('invalid value') ||
    lowerMessage.includes('syntax error')
  ) {
    feathersError = new errors.BadRequest(message)
  }
  // Permission/Access patterns (Forbidden)
  else if (
    lowerMessage.includes('permission') ||
    lowerMessage.includes('access denied') ||
    lowerMessage.includes('insufficient privileges') ||
    lowerMessage.includes('unauthorized') ||
    lowerMessage.includes('forbidden')
  ) {
    feathersError = new errors.Forbidden(message)
  }
  // Connection/Availability patterns (Unavailable)
  else if (
    lowerMessage.includes('connection') ||
    lowerMessage.includes('timeout') ||
    lowerMessage.includes('network') ||
    lowerMessage.includes('unreachable') ||
    lowerMessage.includes('service unavailable') ||
    lowerMessage.includes('database is locked') ||
    lowerMessage.includes('server closed') ||
    lowerMessage.includes('connection refused')
  ) {
    feathersError = new errors.Unavailable(message)
  }
  // Unprocessable patterns
  else if (
    lowerMessage.includes('invalid format') ||
    lowerMessage.includes('malformed') ||
    lowerMessage.includes('cannot convert') ||
    lowerMessage.includes('type mismatch')
  ) {
    feathersError = new errors.Unprocessable(message)
  }
  // Default to GeneralError for unclassified database errors
  else {
    feathersError = new errors.GeneralError(message)
  }

  // Attach original error for debugging
  feathersError[ERROR] = error

  throw feathersError
}
