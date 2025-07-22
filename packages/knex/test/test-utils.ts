import knex from 'knex'
import { connection } from './connection'

export interface TestDatabaseSetup {
  db: any
  cleanup: () => Promise<void>
}

/**
 * Create a database instance for testing
 */
export function createTestDatabase(testName: string): TestDatabaseSetup {
  const TYPE = process.env.TEST_DB || 'sqlite'
  let db: any

  const getDb = () => {
    if (!db) {
      db = knex(connection(TYPE, testName) as any)
    }
    return db
  }

  const cleanup = async () => {
    if (db) {
      await db.destroy()
      db = null
    }
  }

  return {
    get db() {
      return getDb()
    },
    cleanup
  }
}

/**
 * Standard table schema for tests
 */
export async function createPeopleTable(db: any, tableName = 'people', idField = 'id') {
  await db.schema.dropTableIfExists(tableName)
  await db.schema.createTable(tableName, (table: any) => {
    table.increments(idField)
    table.string('name').notNullable()
    table.integer('age')
    table.integer('time')
    table.boolean('created')
    return table
  })
}

/**
 * Create a clean database setup for tests
 */
export async function setupCleanDatabase(testName: string, tableName = 'people', idField = 'id') {
  const setup = createTestDatabase(testName)
  await createPeopleTable(setup.db, tableName, idField)
  return setup
}
