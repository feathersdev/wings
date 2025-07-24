import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { MongoClient, ObjectId } from 'mongodb'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { MongodbAdapter } from '../src'

describe('MongoDB-Specific Features', () => {
  let mongod: MongoMemoryServer
  let client: MongoClient
  let db: any
  let adapter: MongodbAdapter<any>

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create({
      binary: {
        version: '8.0.0'
      }
    })
    client = await MongoClient.connect(mongod.getUri())
    db = client.db('features-test')
  }, 60000)

  afterAll(async () => {
    await client.close()
    await mongod.stop()
  })

  describe('Native MongoDB Query Operators', () => {
    beforeEach(async () => {
      adapter = new MongodbAdapter({
        Model: db.collection('query-test')
      })
      await db.collection('query-test').deleteMany({})
    })

    it('should support mixing native MongoDB operators with Wings operators', async () => {
      await adapter.create([
        { name: 'Alice Johnson', description: 'Test user account' },
        { name: 'Bob Smith', description: 'Another test account' },
        { name: 'alice cooper', description: 'Music test data' }
      ])

      const result = await adapter.find({
        query: {
          name: { $regex: /^A/i }, // Native MongoDB regex
          description: { $like: '%test%' } // Wings operator
        }
      })

      expect(result.length).toBe(2)
      expect(result.every((r) => r.name.toLowerCase().startsWith('a'))).toBe(true)
    })

    it('should preserve native regex objects', async () => {
      await adapter.create([
        { email: 'test@example.com' },
        { email: 'user@test.com' },
        { email: 'admin@example.org' }
      ])

      const result = await adapter.find({
        query: { email: /\.com$/ }
      })

      expect(result.length).toBe(2)
      expect(result.every((r) => r.email.endsWith('.com'))).toBe(true)
    })

    it('should support array query operators', async () => {
      await adapter.create([
        { name: 'Product 1', tags: ['electronics', 'mobile', 'phone'] },
        { name: 'Product 2', tags: ['electronics', 'laptop'] },
        { name: 'Product 3', tags: ['books', 'fiction'] }
      ])

      // Test $all
      const allResult = await adapter.find({
        query: { tags: { $all: ['electronics', 'mobile'] } }
      })
      expect(allResult.length).toBe(1)
      expect(allResult[0].name).toBe('Product 1')

      // Test $elemMatch
      const elemResult = await adapter.find({
        query: { tags: { $elemMatch: { $eq: 'laptop' } } }
      })
      expect(elemResult.length).toBe(1)
      expect(elemResult[0].name).toBe('Product 2')

      // Test $size
      const sizeResult = await adapter.find({
        query: { tags: { $size: 2 } }
      })
      expect(sizeResult.length).toBe(2)
    })

    it('should support nested field queries', async () => {
      await adapter.create([
        { name: 'User 1', profile: { age: 25, city: 'New York' } },
        { name: 'User 2', profile: { age: 30, city: 'London' } },
        { name: 'User 3', profile: { age: 25, city: 'Paris' } }
      ])

      const result = await adapter.find({
        query: {
          'profile.age': 25,
          'profile.city': { $ne: 'Paris' }
        }
      })

      expect(result.length).toBe(1)
      expect(result[0].name).toBe('User 1')
    })
  })

  describe('Text Search', () => {
    beforeAll(async () => {
      adapter = new MongodbAdapter({
        Model: db.collection('text-search')
      })
      await db.collection('text-search').createIndex({ content: 'text', title: 'text' })

      await adapter.create([
        { title: 'MongoDB Tutorial', content: 'Learn about database indexing and queries' },
        { title: 'JavaScript Guide', content: 'Modern JavaScript programming techniques' },
        { title: 'Database Design', content: 'Best practices for MongoDB schema design' }
      ])
    })

    afterAll(async () => {
      await db.collection('text-search').dropIndexes()
      await db.collection('text-search').deleteMany({})
    })

    it('should support $text search', async () => {
      const result = await adapter.find({
        query: { $text: { $search: 'MongoDB' } }
      })

      expect(result.length).toBe(2)
      expect(result.some((r) => r.title === 'MongoDB Tutorial')).toBe(true)
      expect(result.some((r) => r.title === 'Database Design')).toBe(true)
    })

    it('should support $text with score projection', async () => {
      const result = await adapter.find({
        query: {
          $text: { $search: 'MongoDB database' },
          $select: ['title', 'score']
        },
        mongodb: {
          projection: { score: { $meta: 'textScore' } }
        }
      })

      expect(result.length).toBeGreaterThan(0)
    })
  })

  describe('Null and Undefined Handling', () => {
    beforeEach(async () => {
      adapter = new MongodbAdapter({
        Model: db.collection('null-test')
      })
      await db.collection('null-test').deleteMany({})
    })

    it('should differentiate between null and undefined', async () => {
      await adapter.create([
        { name: 'Has null', value: null },
        { name: 'Has undefined', value: undefined },
        { name: 'No value field' }
      ])

      // Find documents where value is null
      const nullResult = await adapter.find({
        query: { value: null }
      })
      expect(nullResult.length).toBe(3) // MongoDB treats undefined as null in queries

      // Find documents where value exists
      const existsResult = await adapter.find({
        query: { value: { $exists: true } }
      })
      expect(existsResult.length).toBe(2) // Only stored null and undefined

      // Using $isNull operator
      const isNullResult = await adapter.find({
        query: { value: { $isNull: true } }
      })
      expect(isNullResult.length).toBe(3)
    })
  })

  describe('ObjectId Type Handling', () => {
    it('should preserve ObjectId types in custom fields', async () => {
      adapter = new MongodbAdapter({
        Model: db.collection('objectid-test')
      })

      // Clear any existing data
      await db.collection('objectid-test').deleteMany({})

      const refId = new ObjectId()
      const created = await adapter.create({
        name: 'Test',
        referenceId: refId
      })

      expect(created.referenceId).toBeInstanceOf(ObjectId)
      expect(created.referenceId.toString()).toBe(refId.toString())

      // Find by _id to verify the document was created
      const byId = await adapter.get(created._id)
      expect(byId).toBeTruthy()
      expect(byId.referenceId).toBeInstanceOf(ObjectId)
      expect(byId.referenceId.toString()).toBe(refId.toString())

      // For non-_id ObjectId fields, MongoDB doesn't auto-convert, so we query by string or use raw MongoDB
      const found = await adapter.find({
        query: { name: 'Test' } // Query by a different field
      })
      expect(found.length).toBe(1)
      expect(found[0].referenceId.toString()).toBe(refId.toString())
    })

    it('should handle string to ObjectId conversion for _id field', async () => {
      adapter = new MongodbAdapter({
        Model: db.collection('id-conversion')
      })

      const created = await adapter.create({ name: 'Test' })
      const stringId = created._id.toString()

      // Get by string ID should work
      const found = await adapter.get(stringId)
      expect(found).toBeTruthy()
      expect(found.name).toBe('Test')
    })
  })

  describe('Special Characters and Edge Cases', () => {
    beforeEach(async () => {
      adapter = new MongodbAdapter({
        Model: db.collection('edge-cases')
      })
      await db.collection('edge-cases').deleteMany({})
    })

    it('should handle empty string patterns in $like', async () => {
      await adapter.create([{ name: 'Test' }, { name: '' }, { name: 'Another' }])

      const result = await adapter.find({
        query: { name: { $like: '' } }
      })
      expect(result.length).toBe(1)
      expect(result[0].name).toBe('')
    })

    it('should handle special regex characters in $like patterns', async () => {
      await adapter.create([
        { pattern: 'test.file' },
        { pattern: 'test*file' },
        { pattern: 'test+file' },
        { pattern: 'test$file' }
      ])

      // Dots should be escaped
      const dotResult = await adapter.find({
        query: { pattern: { $like: 'test.file' } }
      })
      expect(dotResult.length).toBe(1)
      expect(dotResult[0].pattern).toBe('test.file')

      // Special chars should be escaped
      const starResult = await adapter.find({
        query: { pattern: { $like: 'test*file' } }
      })
      expect(starResult.length).toBe(1)
      expect(starResult[0].pattern).toBe('test*file')
    })

    it('should handle very large documents', async () => {
      const largeArray = new Array(1000).fill({ data: 'x'.repeat(1000) })
      const created = await adapter.create({
        name: 'Large',
        bigData: largeArray
      })

      expect(created._id).toBeDefined()

      const found = await adapter.get(created._id)
      expect(found.bigData.length).toBe(1000)
    })
  })
})
