import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  fullWingsTests,
  fullFeathersTests,
  Person,
  ServiceFactory,
  WINGS_CONFIG,
  FEATHERS_CONFIG,
  TestConfig
} from '@wingshq/adapter-tests'
import { Kysely } from 'kysely'
import { KyselyAdapter } from '../src'
import { FeathersKyselyAdapter } from '../src/feathers'
import { setupCleanDatabase, TestDatabaseSetup } from './connection'

// Extend Person type to include additional fields for tests
interface ExtendedPerson extends Person {
  created?: boolean
  email?: string
}

// Create test database interface
interface TestDatabase {
  people: ExtendedPerson
}

// Use predefined configurations from adapter-tests package
// WINGS_CONFIG and FEATHERS_CONFIG are imported above

// Create custom configs with proper nonExistentId for PostgreSQL
const wingsConfig: TestConfig = {
  ...WINGS_CONFIG,
  nonExistentId: process.env.TEST_DB === 'postgres' ? 999999 : '568225fbfe21222432e836ff'
}

const feathersConfig: TestConfig = {
  ...FEATHERS_CONFIG,
  nonExistentId: process.env.TEST_DB === 'postgres' ? 999999 : '568225fbfe21222432e836ff'
}

describe('Kysely Adapter Tests', () => {
  let dbSetup: TestDatabaseSetup
  let db: Kysely<TestDatabase>

  beforeEach(async () => {
    dbSetup = await setupCleanDatabase('kysely-test', 'people')
    db = dbSetup.db
  })

  afterEach(async () => {
    await dbSetup.cleanup()
  })

  describe('Wings Interface', () => {
    let adapter: KyselyAdapter<ExtendedPerson>

    beforeEach(() => {
      const TYPE = process.env.TEST_DB || 'sqlite'
      adapter = new KyselyAdapter<Person>({
        Model: db,
        table: 'people',
        id: 'id',
        dialect: TYPE === 'postgres' ? 'postgres' : 'sqlite'
      })
    })

    it('instantiated the Wings adapter', () => {
      const TYPE = process.env.TEST_DB || 'sqlite'
      expect(adapter).toBeDefined()
      expect(adapter).toBeInstanceOf(KyselyAdapter)
      expect(adapter.id).toBe('id')
      expect(adapter.table).toBe('people')
      expect(adapter.dialect).toBe(TYPE === 'postgres' ? 'postgres' : 'sqlite')
    })

    const serviceFactory: ServiceFactory<KyselyAdapter<ExtendedPerson>> = () => adapter
    fullWingsTests(serviceFactory, 'id', wingsConfig)
  })

  describe('FeathersJS Interface', () => {
    let adapter: FeathersKyselyAdapter<ExtendedPerson>

    beforeEach(() => {
      const TYPE = process.env.TEST_DB || 'sqlite'
      adapter = new FeathersKyselyAdapter<Person>({
        Model: db,
        table: 'people',
        id: 'id',
        dialect: TYPE === 'postgres' ? 'postgres' : 'sqlite'
      })
    })

    it('instantiated the FeathersJS adapter', () => {
      expect(adapter).toBeDefined()
      expect(adapter).toBeInstanceOf(FeathersKyselyAdapter)
      expect(adapter.id).toBe('id')
      expect(adapter.table).toBe('people')
    })

    const serviceFactory: ServiceFactory<FeathersKyselyAdapter<ExtendedPerson>> = () => adapter
    fullFeathersTests(serviceFactory, 'id', feathersConfig)
  })

  describe('Kysely-specific features', () => {
    let adapter: KyselyAdapter<ExtendedPerson>

    beforeEach(() => {
      const TYPE = process.env.TEST_DB || 'sqlite'
      adapter = new KyselyAdapter<Person>({
        Model: db,
        table: 'people',
        id: 'id',
        dialect: TYPE === 'postgres' ? 'postgres' : 'sqlite'
      })
    })

    it('should support transactions', async () => {
      const person1 = { name: 'Alice', age: 30 }
      const person2 = { name: 'Bob', age: 25 }

      await db.transaction().execute(async (trx) => {
        // Create records in transaction
        const created1 = await adapter.create(person1, { transaction: trx as any })
        const created2 = await adapter.create(person2, { transaction: trx as any })

        expect(created1.name).toBe('Alice')
        expect(created2.name).toBe('Bob')

        // Find in transaction
        const found = await adapter.find({ transaction: trx as any })
        expect(found).toHaveLength(2)
      })

      // Verify outside transaction
      const allPeople = await adapter.find()
      expect(allPeople).toHaveLength(2)
    })

    it('should handle complex queries with $or and $and', async () => {
      // Create test data
      await adapter.create([
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 },
        { name: 'Charlie', age: 35 },
        { name: 'David', age: 28 }
      ])

      // Complex $or query
      const result1 = await adapter.find({
        query: {
          $or: [{ name: 'Alice' }, { age: { $gt: 30 } }]
        }
      })
      expect(result1).toHaveLength(2)
      expect(result1.map((p) => p.name).sort()).toEqual(['Alice', 'Charlie'])

      // Complex $and query
      const result2 = await adapter.find({
        query: {
          $and: [{ age: { $gte: 25 } }, { age: { $lte: 30 } }]
        }
      })
      expect(result2).toHaveLength(3)

      // Nested conditions
      const result3 = await adapter.find({
        query: {
          $or: [
            {
              $and: [{ age: { $gt: 30 } }, { name: { $like: 'C%' } }]
            },
            { name: 'Bob' }
          ]
        }
      })
      expect(result3).toHaveLength(2)
      expect(result3.map((p) => p.name).sort()).toEqual(['Bob', 'Charlie'])
    })

    it('should handle $like and $notlike operators', async () => {
      await adapter.create([
        { name: 'Alice Johnson', age: 30 },
        { name: 'Bob Smith', age: 25 },
        { name: 'Charlie Brown', age: 35 }
      ])

      // $like operator
      const result1 = await adapter.find({
        query: {
          name: { $like: '%Johnson' }
        }
      })
      expect(result1).toHaveLength(1)
      expect(result1[0].name).toBe('Alice Johnson')

      // $notlike operator
      const result2 = await adapter.find({
        query: {
          name: { $notlike: '%Smith' }
        }
      })
      expect(result2).toHaveLength(2)
      expect(result2.map((p) => p.name).sort()).toEqual(['Alice Johnson', 'Charlie Brown'])
    })

    it('should handle $isNull operator', async () => {
      // Add nullable column for testing
      await db.schema.alterTable('people').addColumn('nickname', 'text').execute()

      interface PersonWithNickname extends Person {
        nickname?: string | null
      }

      const adapterWithNickname = new KyselyAdapter<PersonWithNickname>({
        Model: db,
        table: 'people',
        id: 'id',
        dialect: 'sqlite'
      })

      await adapterWithNickname.create([
        { name: 'Alice', age: 30, nickname: 'Ali' },
        { name: 'Bob', age: 25, nickname: null },
        { name: 'Charlie', age: 35 }
      ])

      // Find records where nickname is null
      const nullNicknames = await adapterWithNickname.find({
        query: {
          nickname: { $isNull: true }
        }
      })
      expect(nullNicknames).toHaveLength(2)
      expect(nullNicknames.map((p) => p.name).sort()).toEqual(['Bob', 'Charlie'])

      // Find records where nickname is not null
      const notNullNicknames = await adapterWithNickname.find({
        query: {
          nickname: { $isNull: false }
        }
      })
      expect(notNullNicknames).toHaveLength(1)
      expect(notNullNicknames[0].name).toBe('Alice')
    })
  })
})
