import { Kysely, PostgresDialect, SqliteDialect } from 'kysely'
import Database from 'better-sqlite3'
import pg from 'pg'

export interface TestDatabaseSetup {
  db: Kysely<any>
  cleanup: () => Promise<void>
  tableSetup: (tableName: string, idField?: string) => Promise<void>
}

export const connection = (DB: string, testName?: string) => {
  if (DB === 'postgres') {
    return new Kysely({
      dialect: new PostgresDialect({
        pool: new pg.Pool({
          host: 'localhost',
          port: 15432,
          database: 'feathers',
          user: 'postgres',
          password: 'postgres',
          max: 10
        })
      })
    })
  }

  return new Kysely({
    dialect: new SqliteDialect({
      database: new Database(testName ? `./db-${testName}.sqlite` : ':memory:')
    })
  })
}

export async function createTestDatabase(testName: string): Promise<TestDatabaseSetup> {
  const TYPE = process.env.TEST_DB || 'sqlite'
  const db = connection(TYPE, testName)

  const cleanup = async () => {
    await db.destroy()
  }

  const tableSetup = async (tableName = 'people', idField = 'id') => {
    // Drop table if exists
    await db.schema.dropTable(tableName).ifExists().execute()

    // Create table
    await db.schema
      .createTable(tableName)
      .addColumn(idField, TYPE === 'postgres' ? 'serial' : 'integer', (col) =>
        TYPE === 'postgres' ? col.primaryKey() : col.primaryKey().autoIncrement()
      )
      .addColumn('name', TYPE === 'postgres' ? 'varchar(255)' : 'text', (col) => col.notNull())
      .addColumn('age', 'integer')
      .addColumn('time', 'integer')
      .addColumn('created', 'boolean', (col) => col.defaultTo(false))
      .addColumn('email', TYPE === 'postgres' ? 'varchar(255)' : 'text')
      .execute()
  }

  return {
    db,
    cleanup,
    tableSetup
  }
}

export async function setupCleanDatabase(testName: string, tableName = 'people', idField = 'id') {
  const setup = await createTestDatabase(testName)
  await setup.tableSetup(tableName, idField)
  return setup
}
