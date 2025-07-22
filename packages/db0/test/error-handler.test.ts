import { describe, it, expect } from 'vitest'
import { errorHandler } from '../src/error-handler'
import { errors } from '@feathersjs/errors'

describe('DB0 Error Handler', () => {
  it('should map "not found" patterns to NotFound error', () => {
    const error = new Error('Record not found')

    expect(() => errorHandler(error)).toThrowError(errors.NotFound)
    expect(() => errorHandler(error)).toThrowError('Record not found')
  })

  it('should map constraint patterns to BadRequest error', () => {
    const error = new Error('UNIQUE constraint failed')

    expect(() => errorHandler(error)).toThrowError(errors.BadRequest)
    expect(() => errorHandler(error)).toThrowError('UNIQUE constraint failed')
  })

  it('should map permission patterns to Forbidden error', () => {
    const error = new Error('Permission denied')

    expect(() => errorHandler(error)).toThrowError(errors.Forbidden)
    expect(() => errorHandler(error)).toThrowError('Permission denied')
  })

  it('should map connection patterns to Unavailable error', () => {
    const error = new Error('Connection timeout')

    expect(() => errorHandler(error)).toThrowError(errors.Unavailable)
    expect(() => errorHandler(error)).toThrowError('Connection timeout')
  })

  it('should map unknown errors to GeneralError', () => {
    const error = new Error('Some random error')

    expect(() => errorHandler(error)).toThrowError(errors.GeneralError)
    expect(() => errorHandler(error)).toThrowError('Some random error')
  })

  it('should not double-wrap FeathersJS errors', () => {
    const originalError = new errors.BadRequest('Already a FeathersJS error')

    const result = errorHandler(originalError)
    expect(result).toBe(originalError)
  })

  it('should attach original error for debugging', () => {
    const originalError = new Error('Database error')

    try {
      errorHandler(originalError)
    } catch (thrownError: any) {
      expect(thrownError[Symbol.for('@wingshq/db0/error')]).toBe(originalError)
    }
  })
})
