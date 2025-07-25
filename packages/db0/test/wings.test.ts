import { describe, beforeAll, afterAll } from 'vitest'
import { Db0Adapter } from '../src/service.js'
import { errorHandler } from '../src/error-handler.js'
import { fullWingsTests, WINGS_CONFIG, TestConfig } from '@wingshq/adapter-tests'
import type { DbRecord } from '../src/service.js'
import type { Person } from '@wingshq/adapter-tests'
import { setupCleanDatabase, TestDatabaseSetup } from './connection.js'

interface User extends DbRecord, Person {
  id: number
  name: string
  age: number
  created?: boolean
}

let dbSetup: TestDatabaseSetup
let adapter: Db0Adapter<User>

describe('Db0 Adapter - Comprehensive Test Suite', () => {
  beforeAll(async () => {
    dbSetup = await setupCleanDatabase('wings', 'users')
    const TYPE = process.env.TEST_DB || 'sqlite'
    adapter = new Db0Adapter<User>({
      db: dbSetup.db,
      table: 'users',
      idField: 'id',
      dialect: TYPE === 'postgres' ? 'postgres' : TYPE === 'mysql' ? 'mysql' : 'sqlite'
    })
  })

  afterAll(async () => {
    await dbSetup.cleanup()
  })

  // Create adapter factory function
  const createAdapter = () => adapter

  // Custom config for PostgreSQL integer IDs
  const customConfig: TestConfig = {
    ...WINGS_CONFIG,
    nonExistentId:
      process.env.TEST_DB === 'postgres' || process.env.TEST_DB === 'mysql'
        ? 999999
        : '568225fbfe21222432e836ff'
  }

  // Run the full Wings test suite (common + Wings-specific tests) with error handler
  fullWingsTests(createAdapter, 'id', customConfig, errorHandler)
})
