import { describe } from 'vitest'
import { service } from '../src/feathers.js'
import { commonTests, feathersTests, FEATHERS_CONFIG } from '@wingshq/adapter-tests'
import { errorHandler } from '../src/error-handler.js'
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

  // Run common tests with FeathersJS configuration and error handler
  commonTests(createService, 'id', FEATHERS_CONFIG, errorHandler)

  // Run FeathersJS-specific tests
  feathersTests(createService, 'id')
})
