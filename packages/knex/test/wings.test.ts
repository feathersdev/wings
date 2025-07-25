import { describe, beforeAll, afterAll } from 'vitest'
import { commonTests, wingsTests, WINGS_CONFIG } from '@wingshq/adapter-tests'
import { KnexAdapter } from '../src/index'
import { errorHandler } from '../src/error-handler'
import { setupCleanDatabase, TestDatabaseSetup } from './test-utils'

describe('Wings Knex Adapter', () => {
  let dbSetup: TestDatabaseSetup

  // Create a service factory for test isolation
  const createService = () => {
    return new KnexAdapter({
      Model: dbSetup.db,
      name: 'people'
    })
  }

  beforeAll(async () => {
    dbSetup = await setupCleanDatabase('wings')
  })

  afterAll(async () => {
    await dbSetup.cleanup()
  })

  // For PostgreSQL, we need to use integer IDs for "not found" tests
  const testConfig = {
    ...WINGS_CONFIG,
    // Use a large integer that won't exist instead of string IDs for PostgreSQL
    nonExistentId:
      process.env.TEST_DB === 'postgres' || process.env.TEST_DB === 'mysql'
        ? 999999999
        : '568225fbfe21222432e836ff'
  }

  // Run the comprehensive test suites
  commonTests(createService, 'id', testConfig, errorHandler)
  wingsTests(createService, 'id', testConfig)
})

describe('Wings Knex Adapter with custom id', () => {
  let dbSetup: TestDatabaseSetup

  // Create a service factory for test isolation
  const createService = () => {
    return new KnexAdapter({
      Model: dbSetup.db,
      name: 'people-customid',
      id: 'customid'
    })
  }

  beforeAll(async () => {
    dbSetup = await setupCleanDatabase('wings', 'people-customid', 'customid')
  })

  afterAll(async () => {
    await dbSetup.cleanup()
  })

  // For PostgreSQL, we need to use integer IDs for "not found" tests
  const testConfig = {
    ...WINGS_CONFIG,
    // Use a large integer that won't exist instead of string IDs for PostgreSQL
    nonExistentId:
      process.env.TEST_DB === 'postgres' || process.env.TEST_DB === 'mysql'
        ? 999999999
        : '568225fbfe21222432e836ff'
  }

  // Run the comprehensive test suites
  commonTests(createService, 'customid', testConfig, errorHandler)
  wingsTests(createService, 'customid', testConfig)
})
