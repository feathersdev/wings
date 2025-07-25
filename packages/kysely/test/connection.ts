import { Kysely, PostgresDialect, SqliteDialect, MysqlDialect } from 'kysely'
import Database from 'better-sqlite3'
import pg from 'pg'
import { createPool } from 'mysql2'

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

  if (DB === 'mysql') {
    return new Kysely({
      dialect: new MysqlDialect({
        pool: createPool({
          host: 'localhost',
          port: 23306,
          database: 'feathers',
          user: 'mysql',
          password: 'mysql',
          waitForConnections: true,
          connectionLimit: 10,
          queueLimit: 0
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
      .addColumn(
        idField,
        TYPE === 'postgres' ? 'serial' : TYPE === 'mysql' ? 'integer' : 'integer',
        (col) => {
          if (TYPE === 'postgres') {
            return col.primaryKey()
          } else if (TYPE === 'mysql') {
            return col.primaryKey().autoIncrement()
          } else {
            return col.primaryKey().autoIncrement()
          }
        }
      )
      .addColumn('name', TYPE === 'sqlite' ? 'text' : 'varchar(255)', (col) => col.notNull())
      .addColumn('age', 'integer')
      .addColumn('time', 'integer')
      .addColumn('created', 'boolean', (col) => col.defaultTo(false))
      .addColumn('email', TYPE === 'sqlite' ? 'text' : 'varchar(255)')
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
