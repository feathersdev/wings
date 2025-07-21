import type { DbRecord } from '../src/service'
import assert from 'node:assert'
import { createDatabase } from 'db0'
import sqlite from 'db0/connectors/node-sqlite'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { Db0Service } from '../src/service'

const db = createDatabase(sqlite({ name: ':memory:' }))

interface User extends DbRecord {
  id: number
  name: string
  age?: number
  created?: string
  is_active?: boolean
}

const idProp = 'id'
const doug = { id: 3, name: 'Doug', age: 32 }

let service: Db0Service<User>

beforeAll(async () => {
  // Create the users table
  await db.sql`CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, age INTEGER, created TEXT, is_active BOOLEAN)`
})

beforeEach(async () => {
  // Clean up table before each test
  await db.sql`DELETE FROM users`
  // Insert some initial data
  await db.sql`INSERT INTO users (id, name, age) VALUES (1, 'Alice', 12), (2, 'Bob', 28), (3, 'Doug', 32)`
  service = new Db0Service<User>({ db, table: 'users', idField: 'id' })
})

describe('sqlService (sqlite integration)', () => {
  describe('find', () => {
    it('finds by equal', async () => {
      const users = await service.find({ query: { name: 'Alice' } })
      expect(users).toHaveLength(1)
      expect(users[0].name).toBe('Alice')
    })

    it('finds by multiple equal (none)', async () => {
      const users = await service.find({ query: { name: 'Alice', age: 20 } })
      expect(users).toHaveLength(0)
    })

    it('finds with $sort ascending', async () => {
      const users = await service.find({ query: { $sort: { name: 1 } } })
      expect(users.map((u) => u.name)).toEqual(['Alice', 'Bob', 'Doug'])
    })

    it('finds with $sort descending', async () => {
      const users = await service.find({ query: { $sort: { name: -1 } } })
      expect(users.map((u) => u.name)).toEqual(['Doug', 'Bob', 'Alice'])
    })

    it('finds with $limit', async () => {
      const users = await service.find({ query: { $limit: 2 } })
      expect(users).toHaveLength(2)
    })

    it('finds with $limit 0', async () => {
      const users = await service.find({ query: { $limit: 0 } })
      expect(users).toHaveLength(0)
    })

    it('finds with $skip', async () => {
      const users = await service.find({ query: { $sort: { name: 1 }, $skip: 1 } })
      expect(users).toHaveLength(2)
      expect(users.map((u) => u.name)).toEqual(['Bob', 'Doug'])
    })

    it('finds with $select', async () => {
      const users = await service.find({ query: { name: 'Alice', $select: ['name'] } })
      expect(users).toHaveLength(1)
      expect(users[0].name).toBe('Alice')
      expect(users[0].age).toBeUndefined()
      expect(users[0]).toHaveProperty('id')
    })

    it('finds with $or', async () => {
      const users = await service.find({
        query: { $or: [{ name: 'Alice' }, { name: 'Bob' }], $sort: { name: 1 } }
      })
      expect(users).toHaveLength(2)
      expect(users.map((u) => u.name)).toEqual(['Alice', 'Bob'])
    })

    it('finds with $in', async () => {
      const users = await service.find({ query: { name: { $in: ['Alice', 'Bob'] }, $sort: { name: 1 } } })
      expect(users).toHaveLength(2)
      expect(users.map((u) => u.name)).toEqual(['Alice', 'Bob'])
    })

    it('finds with $nin', async () => {
      const users = await service.find({ query: { name: { $nin: ['Alice', 'Bob'] } } })
      expect(users).toHaveLength(1)
      expect(users[0].name).toBe('Doug')
    })

    it('finds with $in: [] returns no results', async () => {
      const users = await service.find({ query: { name: { $in: [] } } })
      expect(users).toHaveLength(0)
    })

    it('finds with $nin: [] returns all results', async () => {
      const users = await service.find({ query: { name: { $nin: [] } } })
      expect(users).toHaveLength(3)
      const names = users.map((u) => u.name)
      expect(names).toContain('Alice')
      expect(names).toContain('Bob')
      expect(names).toContain('Doug')
    })

    it('finds with $like (prefix)', async () => {
      const users = await service.find({ query: { name: { $like: 'A%' } } })
      expect(users).toHaveLength(1)
      expect(users[0].name).toBe('Alice')
    })

    it('finds with $like (suffix)', async () => {
      const users = await service.find({ query: { name: { $like: '%g' } } })
      expect(users).toHaveLength(1)
      expect(users[0].name).toBe('Doug')
    })

    it('finds with $like (middle)', async () => {
      const users = await service.find({ query: { name: { $like: '%li%' } } })
      expect(users).toHaveLength(1)
      expect(users[0].name).toBe('Alice')
    })

    it('finds with $like (no match)', async () => {
      const users = await service.find({ query: { name: { $like: 'Z%' } } })
      expect(users).toHaveLength(0)
    })

    it('finds with $ilike (case-insensitive, prefix)', async () => {
      await service.create({ id: 4, name: 'alice', age: 22 })
      const users = await service.find({ query: { name: { $ilike: 'a%' } }, $sort: { id: 1 } })
      expect(users.map((u) => u.name)).toEqual(['Alice', 'alice'])
    })

    it('finds with $ilike (case-insensitive, middle)', async () => {
      await service.create({ id: 4, name: 'alice', age: 22 })
      await service.create({ id: 5, name: 'ALICIA', age: 30 })
      const users = await service.find({ query: { name: { $ilike: '%li%' } }, $sort: { id: 1 } })
      const names = users.map((u) => u.name)
      expect(names).toContain('Alice')
      expect(names).toContain('alice')
      expect(names).toContain('ALICIA')
    })

    it('finds with $ilike (no match)', async () => {
      const users = await service.find({ query: { name: { $ilike: 'Z%' } } })
      expect(users).toHaveLength(0)
    })

    // Prefer $isNull for SQL-native clarity $exists is supported for compatibility
    it('finds with $isNull: false', async () => {
      // All users have 'name', so $isNull: false should return all
      const users = await service.find({ query: { name: { $isNull: false } } })
      expect(users).toHaveLength(3)
      expect(users.map((u) => u.name).sort()).toEqual(['Alice', 'Bob', 'Doug'])
    })

    it('finds with $isNull: true', async () => {
      // No user has missing 'name', so $isNull: true should return none
      const users = await service.find({ query: { name: { $isNull: true } } })
      expect(users).toHaveLength(0)
    })

    it('finds with $isNull: false on age', async () => {
      // All users have age except possibly some, but in our setup all do
      const users = await service.find({ query: { age: { $isNull: false } } })
      expect(users).toHaveLength(3)
    })

    it('finds with $isNull: true on age', async () => {
      // Remove age from one user and test
      await db.sql`UPDATE users SET age = NULL WHERE name = 'Doug'`
      const users = await service.find({ query: { age: { $isNull: true } } })
      expect(users.map((u) => u.name)).toContain('Doug')
    })

    it('finds with $lt', async () => {
      const users = await service.find({ query: { age: { $lt: 30 } } })
      expect(users).toHaveLength(2)
      expect(users.map((u) => u.name)).toContain('Alice')
      expect(users.map((u) => u.name)).toContain('Bob')
    })

    it('finds with $lte', async () => {
      const users = await service.find({ query: { age: { $lte: 28 } } })
      expect(users).toHaveLength(2)
      expect(users.map((u) => u.name)).toContain('Alice')
      expect(users.map((u) => u.name)).toContain('Bob')
    })

    it('finds with $gt', async () => {
      const users = await service.find({ query: { age: { $gt: 30 } } })
      expect(users).toHaveLength(1)
      expect(users[0].name).toBe('Doug')
    })

    it('finds with $gte', async () => {
      const users = await service.find({ query: { age: { $gte: 28 } } })
      expect(users).toHaveLength(2)
      expect(users.map((u) => u.name)).toContain('Bob')
      expect(users.map((u) => u.name)).toContain('Doug')
    })

    it('finds with $ne', async () => {
      const users = await service.find({ query: { age: { $ne: 28 } } })
      expect(users).toHaveLength(2)
      expect(users.map((u) => u.name)).toContain('Alice')
      expect(users.map((u) => u.name)).toContain('Doug')
    })

    it('finds with $gt + $lt + $sort', async () => {
      const users = await service.find({ query: { age: { $gt: 12, $lt: 32 }, $sort: { name: 1 } } })
      expect(users).toHaveLength(1)
      expect(users[0].name).toBe('Bob')
    })

    it('finds with nested $or', async () => {
      const users = await service.find({
        query: { $or: [{ name: 'Doug' }, { age: { $gt: 12, $lt: 30 } }], $sort: { name: 1 } }
      })
      expect(users).toHaveLength(2)
      expect(users.map((u) => u.name)).toEqual(['Bob', 'Doug'])
    })

    it('finds with $and', async () => {
      const users = await service.find({ query: { $and: [{ age: 12 }], $sort: { name: 1 } } })
      expect(users).toHaveLength(1)
      expect(users[0].name).toBe('Alice')
    })

    it('finds with $and + $or', async () => {
      const users = await service.find({
        query: { $and: [{ $or: [{ name: 'Alice' }] }], $sort: { name: 1 } }
      })
      expect(users).toHaveLength(1)
      expect(users[0].name).toBe('Alice')
    })
  })

  describe('get', () => {
    it('.get', async () => {
      const data = await service.get(doug[idProp])
      assert.strictEqual(data?.[idProp].toString(), doug[idProp].toString(), `${idProp} id matches`)
      assert.strictEqual(data?.name, 'Doug', 'data.name matches')
      assert.strictEqual(data?.age, 32, 'data.age matches')
    })

    it('.get + $select', async () => {
      const data = await service.get(doug[idProp], {
        query: { $select: ['name'] }
      })
      assert.strictEqual(data?.[idProp].toString(), doug[idProp].toString(), `${idProp} id property matches`)
      assert.strictEqual(data?.name, 'Doug', 'data.name matches')
      assert.ok(!data?.age, 'data.age is falsy')
    })

    it('.get + id + query, not found returns null', async () => {
      const result = await service.get(doug[idProp], {
        query: { name: 'Tester' }
      })
      expect(result).toBeNull()
    })

    it('.get with string, not found returns null', async () => {
      const result = await service.get('568225fbfe21222432e836ff')
      expect(result).toBeNull()
    })

    it('.get + not found returns null', async () => {
      const result = await service.get(123456789)
      expect(result).toBeNull()
    })

    it('.get + id + query id', async () => {
      const alice = await service.create({
        name: 'Alice',
        age: 12
      })

      const query = { [idProp]: alice?.[idProp] }
      // querying by id=3 and id=4 should return null
      const result = await service.get(doug[idProp], { query })
      expect(result).toBeNull()

      await service.remove(alice?.[idProp])
    })
  })

  describe('create', () => {
    it('creates a new user', async () => {
      const user = await service.create({ id: 12, name: 'Carol', is_active: 1 })
      expect(user).toEqual({ id: 12, name: 'Carol', age: null, created: null, is_active: 1 })
      const users = await service.find()
      expect(users).toHaveLength(4)
    })

    it('creates multiple users from array', async () => {
      const users = await service.create([
        { id: 20, name: 'A', is_active: 1 },
        { id: 21, name: 'B', age: 33 }
      ])
      expect(Array.isArray(users)).toBe(true)
      expect(users).toHaveLength(2)
      expect(users[0]).toMatchObject({ id: 20, name: 'A', is_active: 1 })
      expect(users[1]).toMatchObject({ id: 21, name: 'B', age: 33 })
    })

    it('creates user with missing optional fields', async () => {
      const user = await service.create({ id: 13, name: 'NoAge' })
      expect(user).toEqual({ id: 13, name: 'NoAge', age: null, created: null, is_active: null })
    })

    it('throws if extra fields are provided', async () => {
      await expect(service.create({ id: 14, name: 'Extra', foo: 'bar' } as any)).rejects.toThrow(
        'table users has no column named foo'
      )
    })

    it('booleans must be provided as 0 or 1', async () => {
      await expect(service.create({ id: 12, name: 'Carol', is_active: true })).rejects.toThrow(TypeError)
    })
  })

  describe('patch', () => {
    it('patches a user', async () => {
      await service.patch(2, { name: 'Robert' })
      const user = await service.get(2)
      expect(user).toEqual({ id: 2, name: 'Robert', age: 28, created: null, is_active: null })
    })

    it('patches multiple fields', async () => {
      await service.patch(2, { name: 'Bobby', age: 99 })
      const user = await service.get(2)
      expect(user).toEqual({ id: 2, name: 'Bobby', age: 99, created: null, is_active: null })
    })

    it('patches with no changes returns original', async () => {
      const original = await service.get(2)
      const result = await service.patch(2, {})
      expect(result).toEqual(original)
    })

    it('patching non-existent record returns null', async () => {
      const result = await service.patch(9999, { name: 'Ghost' })
      expect(result).toBeNull()
    })

    it('patching with invalid field throws', async () => {
      await expect(service.patch(2, { foo: 'bar' } as any)).rejects.toThrow()
    })

    it('patching with null value sets field to null', async () => {
      await service.patch(2, { age: null })
      const user = await service.get(2)
      expect(user?.age).toBeNull()
    })

    it('patches boolean field', async () => {
      await service.patch(2, { is_active: 1 })
      const user = await service.get(2)
      expect(user?.is_active).toBe(1)
    })

    it('patchMany with $in', async () => {
      await service.patchMany({ age: 50 }, { query: { id: { $in: [1, 3] } } })
      const user1 = await service.get(1)
      const user3 = await service.get(3)
      expect(user1?.age).toBe(50)
      expect(user3?.age).toBe(50)
    })
  })

  describe('patchMany', () => {
    it('patches and returns only selected fields with $select', async () => {
      await service.create({ id: 10, name: 'PatchMany', age: 30 })
      const result = await service.patchMany(
        { age: 40 },
        { query: { id: { $in: [1, 10] }, $select: ['id', 'age'] } }
      )
      expect(Array.isArray(result)).toBe(true)
      expect(result).toHaveLength(2)
      expect(result[0]).toHaveProperty('id')
      expect(result[0]).toHaveProperty('age', 40)
      expect(result[0]).not.toHaveProperty('name')
      expect(result[1]).toHaveProperty('id')
      expect(result[1]).toHaveProperty('age', 40)
      expect(result[1]).not.toHaveProperty('name')
    })

    it('patching with query constraint that does not match returns empty array', async () => {
      const result = await service.patchMany({ age: 99 }, { query: { name: 'NotBob' } })
      expect(Array.isArray(result)).toBe(true)
      expect(result).toHaveLength(0)
      // Confirm not changed
      const user = await service.get(2)
      expect(user).not.toMatchObject({ age: 99 })
    })

    it('patchMany with allowAll: true updates all records', async () => {
      const result = await service.patchMany({ age: 77 }, { allowAll: true })
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)
      const all = await Promise.all([service.get(1), service.get(2), service.get(3)])
      all.forEach((user) => expect(user?.age).toBe(77))
    })

    it('patchMany throws if query is empty and allowAll is not set', async () => {
      await expect(service.patchMany({ age: 88 }, {})).rejects.toThrow('patchMany: No query provided')
    })
  })

  describe('remove', () => {
    it('removes a record by id and returns the removed record', async () => {
      const bob = await service.get(2)
      expect(bob).toBeTruthy()
      const removed = await service.remove(2)
      expect(removed).toMatchObject({ id: 2, name: 'Bob' })
      const after = await service.get(2)
      expect(after).toBeNull()
    })

    it('supports $select in query', async () => {
      const removed = await service.remove(3, { query: { $select: ['name'] } })
      expect(removed).toHaveProperty('name', 'Doug')
      expect(removed).not.toHaveProperty('age')
      expect(removed).toHaveProperty('id', 3)
    })

    it('returns null if not found', async () => {
      const removed = await service.remove(9999)
      expect(removed).toBeNull()
    })

    it('returns null for missing id', async () => {
      const removed = await service.remove('')
      expect(removed).toBeNull()
    })

    it('returns null if id+query mismatch', async () => {
      const alice = await service.create({ name: 'Alice', age: 12 })
      const removed = await service.remove(3, { query: { id: alice?.id } })
      expect(removed).toBeNull()
      await service.remove(alice?.id)
    })
  })

  describe('removeMany', () => {
    it('removes multiple records by query and returns removed records', async () => {
      await service.create({ name: 'Dave', age: 29, created: 'yep' })
      await service.create({ name: 'David', age: 3, created: 'yep' })
      const removed = await service.removeMany({ query: { created: 'yep' } })
      expect(Array.isArray(removed)).toBe(true)
      expect(removed.length).toBe(2)
      const names = removed.map((person: any) => person.name)
      expect(names).toContain('Dave')
      expect(names).toContain('David')
      // Confirm they are gone
      const users = await service.find({ query: { created: 'yep' } })
      expect(users.length).toBe(0)
    })

    it('returns empty array if nothing matches query', async () => {
      const removed = await service.removeMany({ query: { created: 'nope' } })
      expect(Array.isArray(removed)).toBe(true)
      expect(removed.length).toBe(0)
    })

    it('throws if no query provided and allowAll is not set', async () => {
      await expect(service.removeMany({})).rejects.toThrow('removeMany: No query provided')
    })

    it('removes all records if allowAll is set', async () => {
      await service.create({ name: 'Zed', age: 99 })
      const removed = await service.removeMany({ allowAll: true })
      expect(Array.isArray(removed)).toBe(true)
      // All users should be removed
      const users = await service.find({})
      expect(users.length).toBe(0)
    })

    it('removeMany supports $select in query', async () => {
      await service.create({ name: 'Zed', age: 99 })
      const removed = await service.removeMany({ query: { age: 99, $select: ['id'] } })
      expect(Array.isArray(removed)).toBe(true)
      expect(removed.length).toBe(1)
      expect(removed[0]).toHaveProperty('id')
      expect(removed[0]).not.toHaveProperty('name')
      expect(removed[0]).not.toHaveProperty('age')
    })
  })

  describe('removeAll', () => {
    it('removes all records and returns empty array', async () => {
      // Confirm initial records exist
      let users = await service.find({})
      expect(users.length).toBeGreaterThan(0)
      // Remove all
      const removed = await service.removeAll()
      expect(Array.isArray(removed)).toBe(true)
      expect(removed.length).toBe(0)
      // Confirm all gone
      users = await service.find({})
      expect(users).toHaveLength(0)
    })

    it('is idempotent: removing all again returns empty array', async () => {
      await service.removeAll()
      const removed = await service.removeAll()
      expect(Array.isArray(removed)).toBe(true)
      expect(removed.length).toBe(0)
    })

    it('removes all after new records are added', async () => {
      await service.removeAll()
      await service.create({ name: 'Eve', age: 40 })
      await service.create({ name: 'Frank', age: 41 })
      let users = await service.find({})
      expect(users.length).toBe(2)
      await service.removeAll()
      users = await service.find({})
      expect(users).toHaveLength(0)
    })
  })
})
