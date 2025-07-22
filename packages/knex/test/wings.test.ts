import { describe, beforeAll, afterAll } from 'vitest'
import { commonTests, wingsTests, WINGS_CONFIG } from '@wingshq/adapter-tests'
import { KnexAdapter } from '../src/index'
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

  // Run the comprehensive test suites
  commonTests(createService, 'id', WINGS_CONFIG)
  wingsTests(createService, 'id')
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

  // Run the comprehensive test suites
  commonTests(createService, 'customid', WINGS_CONFIG)
  wingsTests(createService, 'customid')
})
