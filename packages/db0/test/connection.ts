import { createDatabase } from 'db0'
// @ts-expect-error - db0 connector types have issues with moduleResolution
import postgres from 'db0/connectors/postgresql'
// @ts-expect-error - db0 connector types have issues with moduleResolution
import sqlite from 'db0/connectors/better-sqlite3'
// @ts-expect-error - db0 connector types have issues with moduleResolution
import mysql from 'db0/connectors/mysql2'

export interface TestDatabaseSetup {
  db: any
  cleanup: () => Promise<void>
  tableSetup: (tableName: string, idField?: string) => Promise<void>
}

export const connection = (DB: string, testName?: string) => {
  if (DB === 'postgres') {
    return createDatabase(
      postgres({
        host: 'localhost',
        port: 15432,
        database: 'feathers',
        user: 'postgres',
        password: 'postgres'
      })
    )
  }

  if (DB === 'mysql') {
    return createDatabase(
      mysql({
        host: 'localhost',
        port: 23306,
        database: 'feathers',
        user: 'mysql',
        password: 'mysql'
      })
    )
  }

  return createDatabase(
    sqlite({
      name: testName ? `./db-${testName}.sqlite` : ':memory:'
    })
  )
}

export async function createTestDatabase(testName: string): Promise<TestDatabaseSetup> {
  const TYPE = process.env.TEST_DB || 'sqlite'
  const db = connection(TYPE, testName)

  const cleanup = async () => {
    // For PostgreSQL, we'll drop tables in each test
    // For SQLite, the in-memory database is automatically cleaned up
  }

  const tableSetup = async (tableName = 'people', idField = 'id') => {
    // Drop table if exists - db0 doesn't support table name interpolation, so we use exec
    const dropQuery = `DROP TABLE IF EXISTS ${tableName}`
    await db.exec(dropQuery)

    // Create table based on database type
    if (TYPE === 'postgres') {
      const createQuery = `
        CREATE TABLE ${tableName} (
          ${idField} SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          age INTEGER,
          time INTEGER,
          created BOOLEAN,
          email VARCHAR(255)
        )
      `
      await db.exec(createQuery)
    } else if (TYPE === 'mysql') {
      const createQuery = `
        CREATE TABLE ${tableName} (
          ${idField} INTEGER AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          age INTEGER,
          time INTEGER,
          created BOOLEAN,
          email VARCHAR(255)
        )
      `
      await db.exec(createQuery)
    } else {
      // SQLite
      const createQuery = `
        CREATE TABLE ${tableName} (
          ${idField} INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          age INTEGER,
          time INTEGER,
          created INTEGER,
          email TEXT
        )
      `
      await db.exec(createQuery)
    }
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
