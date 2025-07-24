import { describe, it, afterAll, beforeAll, expect } from 'vitest'
import { MongoClient } from 'mongodb'
import { Person } from '@wingshq/adapter-tests'
import { MongoMemoryServer } from 'mongodb-memory-server'

import { MongodbAdapter } from '../src'

describe('MongoDB Aggregation Tests', () => {
  let mongod: MongoMemoryServer
  let client: MongoClient
  let db: any
  let peopleAdapter: MongodbAdapter<Person>

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create({
      binary: {
        version: '8.0.0'
      }
    })
    const uri = mongod.getUri()
    client = new MongoClient(uri)

    await client.connect()
    db = client.db()

    peopleAdapter = new MongodbAdapter<Person>({
      Model: db.collection('people')
    })
  }, 60000)

  afterAll(async () => {
    if (client) {
      await client.close()
    }
    if (mongod) {
      await mongod.stop()
    }
  })

  describe('Aggregation Pipeline Support', () => {
    let bob: Person
    let alice: Person
    let doug: Person

    type Todo = {
      _id: string
      name: string
      userId: string
      person?: Person
      priority?: number
      tags?: string[]
    }

    let todoAdapter: MongodbAdapter<Todo>

    beforeAll(async () => {
      todoAdapter = new MongodbAdapter<Todo>({
        Model: db.collection('todos')
      })

      bob = await peopleAdapter.create({ name: 'Bob', age: 25 })
      alice = await peopleAdapter.create({ name: 'Alice', age: 19 })
      doug = await peopleAdapter.create({ name: 'Doug', age: 32 })

      // Create tasks with more data for complex testing
      await todoAdapter.create({
        name: 'Bob do dishes',
        userId: bob._id,
        priority: 1,
        tags: ['home', 'cleaning']
      })
      await todoAdapter.create({
        name: 'Bob do laundry',
        userId: bob._id,
        priority: 2,
        tags: ['home', 'cleaning']
      })
      await todoAdapter.create({
        name: 'Alice do dishes',
        userId: alice._id,
        priority: 1,
        tags: ['home', 'cleaning']
      })
      await todoAdapter.create({
        name: 'Doug do dishes',
        userId: doug._id,
        priority: 3,
        tags: ['home', 'cleaning']
      })
    })

    afterAll(async () => {
      await db.collection('people').deleteMany({})
      await db.collection('todos').deleteMany({})
    })

    it('assumes the feathers stage runs before all if it is not explicitly provided in pipeline', async () => {
      const result = await todoAdapter.find({
        query: { name: /dishes/, $sort: { name: 1 } },
        pipeline: [
          {
            $lookup: {
              from: 'people',
              localField: 'userId',
              foreignField: '_id',
              as: 'person'
            }
          },
          { $unwind: { path: '$person' } }
        ]
      })
      expect(result[0].person).toEqual(alice)
      expect(result[1].person).toEqual(bob)
      expect(result[2].person).toEqual(doug)
    })

    it('can prepend stages by explicitly placing the feathers stage', async () => {
      const result = await todoAdapter.find({
        query: { $sort: { name: 1 } },
        pipeline: [
          { $match: { name: 'Bob do dishes' } },
          { $feathers: {} },
          {
            $lookup: {
              from: 'people',
              localField: 'userId',
              foreignField: '_id',
              as: 'person'
            }
          },
          { $unwind: { path: '$person' } }
        ]
      })
      expect(result[0].person).toEqual(bob)
      expect(result.length).toBe(1)
    })

    it('should support aggregation with pagination parameters', async () => {
      const result = await todoAdapter.find({
        query: { $limit: 2, $skip: 1, $sort: { priority: 1 } },
        pipeline: [
          {
            $lookup: {
              from: 'people',
              localField: 'userId',
              foreignField: '_id',
              as: 'person'
            }
          }
        ]
      })
      expect(result.length).toBe(2)
      // After skip 1, first result should be Bob's laundry (priority 2)
      expect(result[0].priority).toBe(1) // Actually Alice's dishes is second with priority 1
    })

    it('should support $group aggregation', async () => {
      const result = (await todoAdapter.find({
        pipeline: [
          {
            $group: {
              _id: '$userId',
              count: { $sum: 1 },
              avgPriority: { $avg: '$priority' }
            }
          }
        ]
      })) as any[]
      expect(result.length).toBe(3) // 3 users
      const bobGroup = result.find((r: any) => r._id.toString() === bob._id.toString())
      expect(bobGroup).toBeDefined()
      expect(bobGroup?.count).toBe(2)
      expect(bobGroup?.avgPriority).toBe(1.5)
    })

    it('should support $facet for multiple aggregations', async () => {
      const result = await todoAdapter.find({
        pipeline: [
          {
            $facet: {
              byPriority: [{ $group: { _id: '$priority', count: { $sum: 1 } } }, { $sort: { _id: 1 } }],
              byUser: [{ $group: { _id: '$userId', tasks: { $push: '$name' } } }]
            }
          }
        ]
      })
      const facetResult = result[0] as any
      expect(facetResult.byPriority).toBeDefined()
      expect(facetResult.byUser).toBeDefined()
      expect(facetResult.byPriority.length).toBe(3) // 3 priority levels
    })

    it('should handle aggregation errors gracefully', async () => {
      try {
        await todoAdapter.find({
          pipeline: [
            { $invalidStage: {} } // Invalid stage
          ]
        })
        expect.fail('Should have thrown an error')
      } catch (err: any) {
        expect(err.name).toContain('Mongo')
      }
    })

    it('should support query operators with aggregation', async () => {
      const result = await todoAdapter.find({
        query: { name: { $like: '%dishes%' }, priority: { $lt: 3 } },
        pipeline: [
          {
            $lookup: {
              from: 'people',
              localField: 'userId',
              foreignField: '_id',
              as: 'person'
            }
          }
        ]
      })
      expect(result.length).toBe(2) // Alice and Bob's dishes (priority 1)
      expect(result.every((r: any) => r.priority < 3)).toBe(true)
    })

    it('should support $wings stage as an alias for $feathers', async () => {
      // Test with $wings - should work identically to $feathers
      const wingsResult = await todoAdapter.find({
        query: { $sort: { name: 1 } },
        pipeline: [
          { $match: { name: 'Bob do dishes' } },
          { $wings: {} }, // Using $wings instead of $feathers
          {
            $lookup: {
              from: 'people',
              localField: 'userId',
              foreignField: '_id',
              as: 'person'
            }
          },
          { $unwind: { path: '$person' } }
        ]
      })

      // Test the exact same query with $feathers
      const feathersResult = await todoAdapter.find({
        query: { $sort: { name: 1 } },
        pipeline: [
          { $match: { name: 'Bob do dishes' } },
          { $feathers: {} }, // Using $feathers
          {
            $lookup: {
              from: 'people',
              localField: 'userId',
              foreignField: '_id',
              as: 'person'
            }
          },
          { $unwind: { path: '$person' } }
        ]
      })

      // Both should return identical results
      expect(wingsResult).toEqual(feathersResult)
      expect(wingsResult[0].person).toEqual(bob)
      expect(wingsResult.length).toBe(1)
    })

    it('should handle both $wings and $feathers in different positions', async () => {
      // Test $wings at the beginning
      const wingsFirst = await todoAdapter.find({
        query: { $limit: 2, $sort: { priority: 1 } },
        pipeline: [{ $wings: {} }, { $project: { name: 1, priority: 1 } }]
      })

      // Test $feathers at the end
      const feathersLast = await todoAdapter.find({
        query: { $limit: 2, $sort: { priority: 1 } },
        pipeline: [{ $project: { name: 1, priority: 1, userId: 1 } }, { $feathers: {} }]
      })

      expect(wingsFirst.length).toBe(2)
      expect(feathersLast.length).toBe(2)
      expect(wingsFirst[0].priority).toBe(1)
      expect(feathersLast[0].priority).toBe(1)
    })

    it('should only use the first $wings or $feathers stage found', async () => {
      // Pipeline with multiple stages - only first should be used
      const result = await todoAdapter.find({
        query: { $sort: { name: 1 } },
        pipeline: [
          { $match: { priority: 1 } },
          { $wings: {} }, // This one should be used
          { $feathers: {} }, // This should be treated as a regular stage
          { $project: { name: 1 } }
        ]
      })

      // Should have 2 results (Alice and Bob's dishes with priority 1)
      expect(result.length).toBe(2)
      expect(result[0].name).toBe('Alice do dishes')
      expect(result[1].name).toBe('Bob do dishes')
    })
  }, 60000)
})
