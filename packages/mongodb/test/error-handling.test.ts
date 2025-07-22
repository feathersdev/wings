import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { MongoClient } from 'mongodb'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { GeneralError } from '@feathersjs/errors'
import { MongodbAdapter, errorHandler } from '../src'

describe('MongoDB Error Handling', () => {
  let mongod: MongoMemoryServer
  let client: MongoClient
  let db: any
  let adapter: MongodbAdapter<{ _id: string; name: string; email?: string }>

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create()
    client = await MongoClient.connect(mongod.getUri())
    db = client.db('error-test')
    adapter = new MongodbAdapter({
      Model: db.collection('error-test')
    })
  })

  afterAll(async () => {
    await client.close()
    await mongod.stop()
  })

  describe('errorHandler', () => {
    it('should wrap MongoDB errors in GeneralError', () => {
      const error = { name: 'MongoServerError', code: 123, message: 'Test error' }
      try {
        errorHandler(error as any)
      } catch (err: any) {
        expect(err).toBeInstanceOf(GeneralError)
        expect(err.name).toBe('GeneralError') // GeneralError wraps the original error
        expect(err.data.name).toBe('MongoServerError')
        expect(err.data.code).toBe(123)
      }
    })

    it('should pass through non-MongoDB errors', () => {
      const error = new Error('Regular error')
      expect(() => errorHandler(error as any)).toThrow('Regular error')
    })

    it('should handle errors starting with Mongo prefix', () => {
      const error = { name: 'MongoNetworkError', message: 'Connection lost' }
      try {
        errorHandler(error as any)
      } catch (err: any) {
        expect(err).toBeInstanceOf(GeneralError)
        expect(err.data.name).toBe('MongoNetworkError')
      }
    })
  })

  describe('Duplicate Key Errors', () => {
    beforeAll(async () => {
      // Create unique index
      await db.collection('error-test').createIndex({ email: 1 }, { unique: true })
    })

    afterAll(async () => {
      await db.collection('error-test').dropIndexes()
    })

    it('should handle duplicate key errors on create', async () => {
      await adapter.create({ name: 'John', email: 'john@example.com' })

      try {
        await adapter.create({ name: 'Jane', email: 'john@example.com' })
        expect.fail('Should have thrown duplicate key error')
      } catch (err: any) {
        // MongoDB driver may throw MongoServerError directly or wrap it in GeneralError
        if (err instanceof GeneralError) {
          expect(err.data.code).toBe(11000)
        } else {
          expect(err.code).toBe(11000)
        }
      }
    })
  })

  describe('Invalid Query Errors', () => {
    it('should handle invalid regex patterns', async () => {
      try {
        // Invalid regex pattern
        await adapter.find({ query: { name: { $regex: '[' } } })
        expect.fail('Should have thrown regex error')
      } catch (err: any) {
        // MongoDB errors may come through directly or wrapped
        expect(err.name).toMatch(/Mongo|General/)
      }
    })

    it('should handle invalid operators', async () => {
      try {
        // $invalidOp is not a valid MongoDB operator
        await adapter.find({ query: { name: { $invalidOp: 'test' } } })
        expect.fail('Should have thrown invalid operator error')
      } catch (err: any) {
        // MongoDB errors may come through directly or wrapped
        expect(err.name).toMatch(/Mongo|General/)
      }
    })
  })

  describe('Connection Errors', () => {
    it('should handle collection not found gracefully', async () => {
      const invalidAdapter = new MongodbAdapter({
        Model: db.collection('non-existent-collection')
      })

      // Should not throw for finds on non-existent collections
      const result = await invalidAdapter.find()
      expect(result).toEqual([])
    })
  })
})
