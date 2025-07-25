import { describe, beforeAll, afterAll } from 'vitest'
import { commonTests, feathersTests, FEATHERS_CONFIG } from '@wingshq/adapter-tests'
import { FeathersKnexAdapter } from '../src/feathers'
import { errorHandler } from '../src/error-handler'
import { setupCleanDatabase, TestDatabaseSetup } from './test-utils'

describe('FeathersJS Knex Adapter', () => {
  let dbSetup: TestDatabaseSetup

  // Create a service factory for test isolation
  const createService = () => {
    return new FeathersKnexAdapter({
      Model: dbSetup.db,
      name: 'people'
    })
  }

  beforeAll(async () => {
    dbSetup = await setupCleanDatabase('feathers')
  })

  afterAll(async () => {
    await dbSetup.cleanup()
  })

  // For PostgreSQL, we need to use integer IDs for "not found" tests
  const testConfig = {
    ...FEATHERS_CONFIG,
    // Use a large integer that won't exist instead of string IDs for PostgreSQL
    nonExistentId:
      process.env.TEST_DB === 'postgres' || process.env.TEST_DB === 'mysql'
        ? 999999999
        : '568225fbfe21222432e836ff'
  }

  // Run the comprehensive test suites
  commonTests(createService, 'id', testConfig, errorHandler)
  feathersTests(createService, 'id', testConfig)
})
