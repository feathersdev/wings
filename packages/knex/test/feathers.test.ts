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

  // Run the comprehensive test suites
  commonTests(createService, 'id', FEATHERS_CONFIG, errorHandler)
  feathersTests(createService, 'id')
})
