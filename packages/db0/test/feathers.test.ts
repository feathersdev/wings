import { beforeAll, describe } from 'vitest'
import { adapter } from '../src/feathers.js'
import { commonTests, feathersTests, FEATHERS_CONFIG, TestConfig } from '@wingshq/adapter-tests'
import { errorHandler } from '../src/error-handler.js'
import { setupCleanDatabase, TestDatabaseSetup } from './connection.js'

let dbSetup: TestDatabaseSetup
let feathersAdapter: any

describe('db0 FeathersJS adapter', () => {
  beforeAll(async () => {
    dbSetup = await setupCleanDatabase('feathers', 'people', 'id')
    const TYPE = process.env.TEST_DB || 'sqlite'

    feathersAdapter = adapter<any>({
      db: dbSetup.db,
      table: 'people',
      idField: 'id',
      dialect: TYPE === 'postgres' ? 'postgres' : TYPE === 'mysql' ? 'mysql' : 'sqlite'
    })
  })

  const createAdapter = () => feathersAdapter

  // Custom config for PostgreSQL integer IDs
  const customConfig: TestConfig = {
    ...FEATHERS_CONFIG,
    nonExistentId:
      process.env.TEST_DB === 'postgres' || process.env.TEST_DB === 'mysql'
        ? 999999
        : '568225fbfe21222432e836ff'
  }

  // Run common tests with FeathersJS configuration and error handler
  commonTests(createAdapter, 'id', customConfig, errorHandler)

  // Run FeathersJS-specific tests
  feathersTests(createAdapter, 'id', customConfig)
})
