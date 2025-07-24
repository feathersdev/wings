import { describe, it, afterAll, beforeAll, expect } from 'vitest'
import { MongoClient, ObjectId } from 'mongodb'
import {
  commonTests,
  wingsTests,
  feathersTests,
  Person,
  COMMON_CONFIG,
  WINGS_CONFIG,
  FEATHERS_CONFIG
} from '@wingshq/adapter-tests'
import { MongoMemoryServer } from 'mongodb-memory-server'

import { MongodbAdapter, FeathersMongodbAdapter } from '../src'

describe('MongoDB Adapters', () => {
  let mongod: MongoMemoryServer
  let client: MongoClient
  let db: any
  let wingsAdapter: MongodbAdapter<Person>
  let wingsCustomAdapter: MongodbAdapter<Person>
  let feathersAdapter: FeathersMongodbAdapter<Person>
  let feathersCustomAdapter: FeathersMongodbAdapter<Person>

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create({
      binary: {
        version: '8.0.0'
      }
    })
    client = await MongoClient.connect(mongod.getUri())
    db = client.db('feathers-test')

    // Wings adapters
    wingsAdapter = new MongodbAdapter<Person>({
      Model: db.collection('wings-people')
    })

    wingsCustomAdapter = new MongodbAdapter<Person>({
      id: 'customid',
      Model: db.collection('wings-people-customid')
    })

    // FeathersJS adapters
    feathersAdapter = new FeathersMongodbAdapter<Person>({
      Model: db.collection('feathers-people')
    })

    feathersCustomAdapter = new FeathersMongodbAdapter<Person>({
      id: 'customid',
      Model: db.collection('feathers-people-customid')
    })
  }, 60000)

  afterAll(async () => {
    await db.dropDatabase()
    await client.close()
    await mongod.stop()
  })

  // Wings adapter tests
  describe('Wings Adapter', () => {
    const createWingsService = () => wingsAdapter
    const createWingsCustomService = () => wingsCustomAdapter

    describe('Standard ID Field', () => {
      describe('Common Tests', () => {
        commonTests(createWingsService, '_id', COMMON_CONFIG)
      })
      describe('Wings Tests', () => {
        wingsTests(createWingsService, '_id', WINGS_CONFIG)
      })
    })

    describe('Custom ID Field', () => {
      describe('Common Tests', () => {
        commonTests(createWingsCustomService, 'customid', COMMON_CONFIG)
      })
      describe('Wings Tests', () => {
        wingsTests(createWingsCustomService, 'customid', WINGS_CONFIG)
      })
    })
  })

  // FeathersJS wrapper tests
  describe('FeathersJS Wrapper', () => {
    const createFeathersService = () => feathersAdapter
    const createFeathersCustomService = () => feathersCustomAdapter

    describe('Standard ID Field', () => {
      describe('Common Tests', () => {
        commonTests(createFeathersService, '_id', FEATHERS_CONFIG)
      })
      describe('FeathersJS Tests', () => {
        feathersTests(createFeathersService, '_id', FEATHERS_CONFIG)
      })
    })

    describe('Custom ID Field', () => {
      describe('Common Tests', () => {
        commonTests(createFeathersCustomService, 'customid', FEATHERS_CONFIG)
      })
      describe('FeathersJS Tests', () => {
        feathersTests(createFeathersCustomService, 'customid', FEATHERS_CONFIG)
      })
    })
  })

  // MongoDB-specific tests
  describe('MongoDB-specific functionality', () => {
    it('instantiated the Wings adapter', () => {
      expect(wingsAdapter).toBeTruthy()
    })

    it('instantiated the FeathersJS adapter', () => {
      expect(feathersAdapter).toBeTruthy()
    })

    describe('Service utility functions', () => {
      describe('getObjectId', () => {
        it('returns an ObjectID instance for a valid ID', () => {
          const id = new ObjectId()
          const result = wingsAdapter.getObjectId(id.toString())
          expect(result.toString()).toBe(id.toString())
        })

        it('returns the original value for a non-valid ID', () => {
          const id = 'non-valid'
          const result = wingsAdapter.getObjectId(id)
          expect(result).toBe(id)
        })

        it('returns the original value for a non-ObjectID field', () => {
          const id = new ObjectId()
          const result = wingsCustomAdapter.getObjectId(id.toString())
          expect(result).toBe(id.toString())
        })
      })
    })

    describe('Special collation param', () => {
      it('sets collation when provided', async () => {
        const person = await wingsAdapter.create({ name: 'Indexed' })

        // Create index for collation test
        await db.collection('wings-people').createIndex(
          { name: 1 },
          {
            partialFilterExpression: { team: 'blue' }
          }
        )

        const result = await wingsAdapter.find({
          query: {},
          mongodb: { collation: { locale: 'en', strength: 1 } }
        })

        expect(Array.isArray(result)).toBe(true)

        await wingsAdapter.remove(person._id)
      })

      it('sets hint when provided', async () => {
        const indexed = await wingsAdapter.create({ name: 'Indexed' })

        // Use _id index which always exists
        const result = await wingsAdapter.find({
          query: {},
          mongodb: { hint: { _id: 1 } }
        })

        expect(result.length).toBeGreaterThanOrEqual(1)
        expect(result.some((item) => item.name === 'Indexed')).toBe(true)

        await wingsAdapter.remove(indexed._id)
      })
    })
  })
})
