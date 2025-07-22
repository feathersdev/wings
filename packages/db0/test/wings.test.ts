import { describe, beforeAll, afterAll } from 'vitest'
import { createDatabase } from 'db0'
import sqlite from 'db0/connectors/node-sqlite'
import { Db0Service } from '../src/service.js'
import { errorHandler } from '../src/error-handler.js'
import { fullWingsTests, WINGS_CONFIG } from '@wingshq/adapter-tests'
import type { DbRecord } from '../src/service.js'
import type { Person } from '@wingshq/adapter-tests'

interface User extends DbRecord, Person {
  id: number
  name: string
  age: number
  created?: boolean
}

const db = createDatabase(sqlite({ name: ':memory:' }))
const service = new Db0Service<User>({ db, table: 'users', idField: 'id' })

const clean = async () => {
  await db.sql`DROP TABLE IF EXISTS users`
  await db.sql`CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, age INTEGER, created BOOLEAN)`
}

describe('Db0 Adapter - Comprehensive Test Suite', () => {
  beforeAll(clean)
  afterAll(async () => {
    await db.sql`DROP TABLE IF EXISTS users`
  })

  // Create service factory function
  const createService = () => service

  // Run the full Wings test suite (common + Wings-specific tests) with error handler
  fullWingsTests(createService, 'id', WINGS_CONFIG, errorHandler)
})
