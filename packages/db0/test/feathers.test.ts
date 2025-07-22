import { describe, it, beforeEach } from 'vitest'
import { assert } from 'vitest'
import { service } from '../src/feathers.js'
import { commonTests, feathersTests, FEATHERS_CONFIG } from '@wingshq/adapter-tests'
import { createDatabase } from 'db0'
import sqlite from 'db0/connectors/node-sqlite'

describe('db0 FeathersJS adapter', () => {
  const createService = () => {
    const db = createDatabase(sqlite({ name: ':memory:' }))

    // Initialize database and tables
    db.prepare(`DROP TABLE IF EXISTS people`).run()
    db.prepare(
      `CREATE TABLE people (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      age INTEGER,
      email TEXT,
      created INTEGER DEFAULT 0
    )`
    ).run()

    return service<any>({
      db,
      table: 'people',
      idField: 'id',
      dialect: 'sqlite'
    })
  }

  // Run common tests with FeathersJS configuration
  commonTests(createService, 'id', FEATHERS_CONFIG)

  // Run FeathersJS-specific tests
  feathersTests(createService, 'id')

  // Additional FeathersJS-specific behaviors
  describe('FeathersJS wrapper behaviors', () => {
    let peopleService: ReturnType<typeof createService>

    beforeEach(() => {
      peopleService = createService()
    })

    it('should paginate by default for find()', async () => {
      // Create test data
      await peopleService.create([
        { name: 'Alice', age: 25 },
        { name: 'Bob', age: 30 }
      ])

      // Without params, should paginate
      const result1 = await peopleService.find()
      assert(result1 && typeof result1 === 'object' && 'data' in result1)
      assert.strictEqual(result1.total, 2)
      assert.strictEqual(result1.data.length, 2)

      // With empty params, should paginate
      const result2 = await peopleService.find({})
      assert(result2 && typeof result2 === 'object' && 'data' in result2)
      assert.strictEqual(result2.total, 2)

      // With paginate: false, should return array
      const result3 = await peopleService.find({ paginate: false })
      assert(Array.isArray(result3))
      assert.strictEqual(result3.length, 2)
    })

    it('should support bulk patch with id: null', async () => {
      // Create test data
      await peopleService.create([
        { name: 'Alice', age: 25 },
        { name: 'Bob', age: 30 }
      ])

      // Bulk patch with id: null
      const result = await peopleService.patch(null, { age: 35 }, {})
      assert(Array.isArray(result))
      assert.strictEqual(result.length, 2)
      assert(result.every((r) => r.age === 35))
    })

    it('should support bulk remove with id: null', async () => {
      // Create test data
      await peopleService.create([
        { name: 'Alice', age: 25 },
        { name: 'Bob', age: 30 }
      ])

      // Bulk remove with id: null
      const result = await peopleService.remove(null, {})
      assert(Array.isArray(result))
      assert.strictEqual(result.length, 2)

      // Verify all removed
      const remaining = await peopleService.find({ paginate: false })
      assert(Array.isArray(remaining))
      assert.strictEqual(remaining.length, 0)
    })

    it('should have an update method', async () => {
      // Create test data
      const created = await peopleService.create({ name: 'Alice', age: 25 })

      // Update the record
      const updated = await peopleService.update(created.id, {
        id: created.id,
        name: 'Alice Updated',
        age: 26,
        email: 'alice@example.com',
        created: created.created
      })

      assert.strictEqual(updated.name, 'Alice Updated')
      assert.strictEqual(updated.age, 26)
      assert.strictEqual(updated.email, 'alice@example.com')
    })
  })
})
