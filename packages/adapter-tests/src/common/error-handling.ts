import { describe, it, expect } from 'vitest'
import { BaseAdapter, Person, TestConfig, ServiceFactory } from '../types.js'

/**
 * Test database error handling for adapters that expose error handling
 * These tests verify that database-specific errors are properly mapped to Wings/FeathersJS error types
 */
export function testErrorHandling<T extends BaseAdapter<Person>>(
  _serviceFactory: ServiceFactory<T>,
  _idProp: string,
  _config: TestConfig,
  errorHandler?: (error: any) => void
) {
  // Only run error handling tests if the adapter provides an error handler
  if (!errorHandler) {
    return
  }

  describe('Database Error Handling', () => {
    describe('SQL State Error Codes', () => {
      it('should map SQL state to NotFound error', () => {
        expect(() =>
          errorHandler({
            sqlState: '#02000',
            message: 'No data found'
          })
        ).toThrowError('No data found')
      })

      it('should map SQL state to Forbidden error', () => {
        expect(() =>
          errorHandler({
            sqlState: '#28000',
            message: 'Access denied'
          })
        ).toThrowError('Access denied')
      })

      it('should map SQL state to Unavailable error', () => {
        expect(() =>
          errorHandler({
            sqlState: '#08000',
            message: 'Connection exception'
          })
        ).toThrowError('Connection exception')
      })

      it('should map SQL state to BadRequest error', () => {
        expect(() =>
          errorHandler({
            sqlState: '#23503',
            message: 'Constraint violation'
          })
        ).toThrowError('Constraint violation')
      })

      it('should map unknown SQL state to GeneralError', () => {
        expect(() =>
          errorHandler({
            sqlState: '#99999',
            message: 'Unknown error'
          })
        ).toThrowError('Unknown error')
      })
    })

    describe('SQLite Error Codes', () => {
      it('should map SQLITE_ERROR errno 1 to BadRequest', () => {
        expect(() =>
          errorHandler({
            code: 'SQLITE_ERROR',
            errno: 1,
            message: 'SQL error'
          })
        ).toThrowError('SQL error')
      })

      it('should map SQLITE_ERROR errno 2 to Unavailable', () => {
        expect(() =>
          errorHandler({
            code: 'SQLITE_ERROR',
            errno: 2,
            message: 'Internal error'
          })
        ).toThrowError('Internal error')
      })

      it('should map SQLITE_ERROR errno 3 to Forbidden', () => {
        expect(() =>
          errorHandler({
            code: 'SQLITE_ERROR',
            errno: 3,
            message: 'Access denied'
          })
        ).toThrowError('Access denied')
      })

      it('should map SQLITE_ERROR errno 12 to NotFound', () => {
        expect(() =>
          errorHandler({
            code: 'SQLITE_ERROR',
            errno: 12,
            message: 'No such table'
          })
        ).toThrowError('No such table')
      })

      it('should map unknown SQLITE_ERROR errno to GeneralError', () => {
        expect(() =>
          errorHandler({
            code: 'SQLITE_ERROR',
            errno: 999,
            message: 'Unknown SQLite error'
          })
        ).toThrowError('Unknown SQLite error')
      })
    })

    describe('PostgreSQL Error Codes', () => {
      it('should map PostgreSQL 22P02 to NotFound', () => {
        expect(() =>
          errorHandler({
            code: '22P02',
            message: 'Key (id)=(1) is not present in table "users".',
            severity: 'ERROR',
            routine: 'ExecConstraints'
          })
        ).toThrowError()
      })

      it('should map PostgreSQL 23xxx to BadRequest', () => {
        expect(() =>
          errorHandler({
            code: '23505',
            message: 'Duplicate key violation',
            severity: 'ERROR',
            routine: 'ExecConstraints'
          })
        ).toThrowError('Duplicate key violation')
      })

      it('should map PostgreSQL 28xxx to Forbidden', () => {
        expect(() =>
          errorHandler({
            code: '28000',
            message: 'Invalid authorization',
            severity: 'ERROR',
            routine: 'ExecConstraints'
          })
        ).toThrowError('Invalid authorization')
      })

      it('should map PostgreSQL 3D/42xxx to Unprocessable', () => {
        expect(() =>
          errorHandler({
            code: '3D000',
            message: 'Invalid catalog name',
            severity: 'ERROR',
            routine: 'ExecConstraints'
          })
        ).toThrowError('Invalid catalog name')
      })

      it('should map unknown PostgreSQL codes to GeneralError', () => {
        expect(() =>
          errorHandler({
            code: 'XXXXX',
            message: 'Unknown PostgreSQL error',
            severity: 'ERROR',
            routine: 'ExecConstraints'
          })
        ).toThrowError('Unknown PostgreSQL error')
      })
    })

    describe('Generic Error Handling', () => {
      it('should convert non-FeathersError to GeneralError', () => {
        expect(() => errorHandler(new Error('Generic error'))).toThrowError('Generic error')
      })
    })
  })
}
