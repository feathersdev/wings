import { describe, it, expect } from 'vitest'
import { errorHandler } from '../src'

describe('Knex Error handler', () => {
  it('sqlState', () => {
    expect(() =>
      errorHandler({
        sqlState: '#23503'
      })
    ).toThrowError()
  })

  it('sqliteError', () => {
    try {
      errorHandler({
        code: 'SQLITE_ERROR',
        errno: 1
      })
    } catch (error: any) {
      expect(error.name).toBe('BadRequest')
    }

    try {
      errorHandler({ code: 'SQLITE_ERROR', errno: 2 })
    } catch (error: any) {
      expect(error.name).toBe('Unavailable')
    }

    try {
      errorHandler({ code: 'SQLITE_ERROR', errno: 3 })
    } catch (error: any) {
      expect(error.name).toBe('Forbidden')
    }

    try {
      errorHandler({ code: 'SQLITE_ERROR', errno: 12 })
    } catch (error: any) {
      expect(error.name).toBe('NotFound')
    }

    try {
      errorHandler({ code: 'SQLITE_ERROR', errno: 13 })
    } catch (error: any) {
      expect(error.name).toBe('GeneralError')
    }
  })

  it('postgresqlError', () => {
    try {
      errorHandler({
        code: '22P02',
        message: 'Key (id)=(1) is not present in table "users".',
        severity: 'ERROR',
        routine: 'ExecConstraints'
      })
    } catch (error: any) {
      expect(error.name).toBe('NotFound')
    }

    try {
      errorHandler({ code: '2874', message: 'Something', severity: 'ERROR', routine: 'ExecConstraints' })
    } catch (error: any) {
      expect(error.name).toBe('Forbidden')
    }

    try {
      errorHandler({ code: '3D74', message: 'Something', severity: 'ERROR', routine: 'ExecConstraints' })
    } catch (error: any) {
      expect(error.name).toBe('Unprocessable')
    }

    try {
      errorHandler({ code: 'XYZ', severity: 'ERROR', routine: 'ExecConstraints' })
    } catch (error: any) {
      expect(error.name).toBe('GeneralError')
    }
  })
})
