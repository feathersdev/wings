import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { createTestDatabase, TestDatabase } from './test-utils'
import { MongodbAdapter } from '../src'

describe('MongoDB Performance and Index Tests', () => {
  let testDb: TestDatabase
  let db: any
  let adapter: MongodbAdapter<any>

  beforeAll(async () => {
    testDb = await createTestDatabase('performance-test')
    db = testDb.client.db()
  }, 60000)

  afterAll(async () => {
    await testDb.cleanup()
  })

  describe('Index Usage', () => {
    beforeAll(async () => {
      adapter = new MongodbAdapter({
        Model: db.collection('indexed-collection')
      })

      // Create various indexes
      await db.collection('indexed-collection').createIndexes([
        { key: { name: 1 }, name: 'name_1' },
        { key: { age: -1 }, name: 'age_-1' },
        { key: { name: 1, age: -1 }, name: 'name_1_age_-1' },
        { key: { email: 1 }, unique: true, name: 'email_unique' }
      ])

      // Insert test data
      const testData = []
      for (let i = 0; i < 100; i++) {
        testData.push({
          name: `User ${i % 10}`,
          age: 20 + (i % 50),
          email: `user${i}@example.com`,
          city: ['New York', 'London', 'Paris', 'Tokyo'][i % 4]
        })
      }
      await adapter.create(testData)
    })

    afterAll(async () => {
      await db.collection('indexed-collection').dropIndexes()
      await db.collection('indexed-collection').deleteMany({})
    })

    it('should use single field index with hint', async () => {
      const result = await adapter.find({
        query: { name: 'User 5' },
        mongodb: { hint: 'name_1' }
      })

      expect(result.length).toBe(10)
      expect(result.every((r) => r.name === 'User 5')).toBe(true)
    })

    it('should use compound index with hint', async () => {
      const result = await adapter.find({
        query: { name: 'User 3', age: { $gte: 30 } },
        mongodb: { hint: { name: 1, age: -1 } }
      })

      expect(result.length).toBeGreaterThan(0)
      expect(result.every((r) => r.name === 'User 3' && r.age >= 30)).toBe(true)
    })

    it('should respect unique index constraints', async () => {
      try {
        await adapter.create({ email: 'user1@example.com' })
        expect.fail('Should have thrown duplicate key error')
      } catch (err: any) {
        // GeneralError wraps the MongoDB error
        expect(err.data?.code || err.code).toBe(11000) // Duplicate key error
      }
    })

    it('should use index for sorting', async () => {
      const result = await adapter.find({
        query: { $sort: { age: -1 }, $limit: 5 }
      })

      expect(result.length).toBe(5)
      // Check descending order
      for (let i = 1; i < result.length; i++) {
        expect(result[i - 1].age).toBeGreaterThanOrEqual(result[i].age)
      }
    })
  })

  describe('Bulk Operations Performance', () => {
    beforeEach(async () => {
      adapter = new MongodbAdapter({
        Model: db.collection('bulk-ops')
      })
      await db.collection('bulk-ops').deleteMany({})
    })

    it('should handle bulk creates efficiently', async () => {
      const bulkData = Array.from({ length: 1000 }, (_, i) => ({
        index: i,
        value: Math.random()
      }))

      const start = Date.now()
      const created = await adapter.create(bulkData)
      const duration = Date.now() - start

      expect(created.length).toBe(1000)
      expect(duration).toBeLessThan(5000) // Should complete within 5 seconds
    })

    it('should handle bulk updates efficiently', async () => {
      // Create initial data
      const initialData = Array.from({ length: 100 }, (_, i) => ({
        index: i,
        status: 'pending'
      }))
      await adapter.create(initialData)

      const start = Date.now()
      const updated = await adapter.patchMany(
        { status: 'completed', updatedAt: new Date() },
        { query: { index: { $lt: 50 } }, allowAll: false }
      )
      const duration = Date.now() - start

      expect(updated.length).toBe(50)
      expect(updated.every((r) => r.status === 'completed')).toBe(true)
      expect(duration).toBeLessThan(1000) // Should complete within 1 second
    })

    it('should handle bulk deletes efficiently', async () => {
      // Create initial data
      const initialData = Array.from({ length: 100 }, (_, i) => ({
        index: i,
        toDelete: i % 2 === 0
      }))
      await adapter.create(initialData)

      const start = Date.now()
      const removed = await adapter.removeMany({
        query: { toDelete: true },
        allowAll: false
      })
      const duration = Date.now() - start

      expect(removed.length).toBe(50)
      expect(duration).toBeLessThan(1000) // Should complete within 1 second

      // Verify remaining documents
      const remaining = await adapter.find()
      expect(remaining.length).toBe(50)
      expect(remaining.every((r) => !r.toDelete)).toBe(true)
    })
  })

  describe('Connection and Cursor Management', () => {
    it('should handle concurrent operations', async () => {
      adapter = new MongodbAdapter({
        Model: db.collection('concurrent-ops')
      })

      // Create test data
      await adapter.create(Array.from({ length: 100 }, (_, i) => ({ index: i })))

      // Run concurrent find operations
      const promises = Array.from({ length: 10 }, (_, i) =>
        adapter.find({ query: { index: { $gte: i * 10, $lt: (i + 1) * 10 } } })
      )

      const results = await Promise.all(promises)

      expect(results.length).toBe(10)
      results.forEach((result, i) => {
        expect(result.length).toBe(10)
        expect(result[0].index).toBeGreaterThanOrEqual(i * 10)
        expect(result[9].index).toBeLessThan((i + 1) * 10)
      })
    })

    it('should support cursor options', async () => {
      adapter = new MongodbAdapter({
        Model: db.collection('cursor-options')
      })

      await adapter.create(Array.from({ length: 50 }, (_, i) => ({ index: i })))

      // Test with noCursorTimeout
      const result = await adapter.find({
        query: { $sort: { index: 1 } },
        mongodb: { noCursorTimeout: true }
      })

      expect(result.length).toBe(50)
    })

    it('should handle large result sets with pagination', async () => {
      adapter = new MongodbAdapter({
        Model: db.collection('large-results')
      })

      // Create large dataset
      const largeData = Array.from({ length: 1000 }, (_, i) => ({
        index: i,
        data: `Item ${i}`
      }))
      await adapter.create(largeData)

      // Test pagination
      const pageSize = 100
      const pages = []

      for (let page = 0; page < 10; page++) {
        const result = await adapter.find({
          query: { $limit: pageSize, $skip: page * pageSize, $sort: { index: 1 } }
        })
        pages.push(result)
      }

      expect(pages.length).toBe(10)
      pages.forEach((page, i) => {
        expect(page.length).toBe(100)
        expect(page[0].index).toBe(i * 100)
        expect(page[99].index).toBe((i + 1) * 100 - 1)
      })
    })
  })

  describe('Memory Efficiency', () => {
    it('should handle projection to reduce memory usage', async () => {
      adapter = new MongodbAdapter({
        Model: db.collection('memory-test')
      })

      // Create documents with large data
      await adapter.create({
        id: 1,
        name: 'Test',
        largeData: 'x'.repeat(1000000), // 1MB of data
        smallField: 'keep this'
      })

      // Query with projection to exclude large field
      const result = await adapter.find({
        query: { id: 1, $select: ['id', 'name', 'smallField'] }
      })

      expect(result.length).toBe(1)
      expect(result[0].id).toBe(1)
      expect(result[0].name).toBe('Test')
      expect(result[0].smallField).toBe('keep this')
      expect(result[0].largeData).toBeUndefined()
    })
  })
})
