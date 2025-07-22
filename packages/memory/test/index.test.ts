import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  commonTests,
  wingsTests,
  feathersTests,
  WINGS_CONFIG,
  FEATHERS_CONFIG,
  Person
} from '@wingshq/adapter-tests'

import { MemoryAdapter, FeathersMemoryAdapter } from '../src'

type Animal = {
  id: number
  type: string
  age: number
}

describe('Wings Memory Adapter', () => {
  let adapter: MemoryAdapter<Person>
  let customIdAdapter: MemoryAdapter<Person>

  beforeAll(() => {
    adapter = new MemoryAdapter<Person>()
    customIdAdapter = new MemoryAdapter<Person>({
      id: 'customid'
    })
  })

  afterAll(async () => {
    // Clean up any remaining data
    await adapter.removeAll()
    await customIdAdapter.removeAll()
  })

  it('patch record with prop also in query', async () => {
    const animals = new MemoryAdapter<Animal>()
    await animals.create([
      {
        type: 'cat',
        age: 30
      },
      {
        type: 'dog',
        age: 10
      }
    ])

    const [updated] = await animals.patchMany({ age: 40 }, { query: { age: 30 }, allowAll: false })

    expect(updated.age).toBe(40)

    await animals.removeAll()
  })

  it('allows to pass custom find and sort matcher', async () => {
    let sorterCalled = false
    let matcherCalled = false

    const service = new MemoryAdapter<Person>({
      matcher() {
        matcherCalled = true
        return function () {
          return true
        }
      },

      sorter() {
        sorterCalled = true
        return function () {
          return 0
        }
      }
    })

    await service.find({
      query: { something: 1, $sort: { something: 1 } }
    })

    expect(sorterCalled).toBe(true)
    expect(matcherCalled).toBe(true)
  })

  it('does not modify the original data', async () => {
    const person = await adapter.create({
      name: 'Delete tester',
      age: 33
    })

    delete (person as any).age

    const otherPerson = await adapter.get(person.id!)

    expect(otherPerson).not.toBeNull()
    expect(otherPerson?.age).toBe(33)

    await adapter.remove(person.id!)
  })

  it('use $select as only query property', async () => {
    const person = await adapter.create({
      name: 'Tester',
      age: 42
    })

    const results = await adapter.find({
      query: {
        $select: ['name']
      }
    })

    expect(results[0]).toEqual({ id: person.id, name: 'Tester' })

    await adapter.remove(person.id!)
  })

  it('using $limit still returns correct total', async () => {
    for (let i = 0; i < 10; i++) {
      await adapter.create({
        name: `Tester ${i}`,
        age: 19
      })
      await adapter.create({
        name: `Tester ${i}`,
        age: 20
      })
    }

    const results = await adapter.find({
      paginate: true,
      query: {
        $skip: 3,
        $limit: 5,
        age: 19
      }
    })

    expect(results.total).toBe(10)
    expect(results.skip).toBe(3)
    expect(results.limit).toBe(5)

    await adapter.removeMany({
      query: {
        age: {
          $in: [19, 20]
        }
      },
      allowAll: false
    })
  })

  it('handles $like operator', async () => {
    await adapter.create([
      { name: 'Alice Johnson', age: 25 },
      { name: 'Bob Smith', age: 30 },
      { name: 'Charlie Brown', age: 35 }
    ])

    const results = await adapter.find({
      query: {
        name: { $like: '%Smith' }
      }
    })

    expect(results.length).toBe(1)
    expect(results[0].name).toBe('Bob Smith')

    await adapter.removeMany({ query: { age: { $gte: 25 } }, allowAll: false })
  })

  it('handles $ilike operator (case insensitive)', async () => {
    await adapter.create([
      { name: 'Alice JOHNSON', age: 25 },
      { name: 'bob smith', age: 30 },
      { name: 'Charlie Brown', age: 35 }
    ])

    const results = await adapter.find({
      query: {
        name: { $ilike: '%johnson' }
      }
    })

    expect(results.length).toBe(1)
    expect(results[0].name).toBe('Alice JOHNSON')

    await adapter.removeMany({ query: { age: { $gte: 25 } }, allowAll: false })
  })

  it('handles $isNull operator', async () => {
    await adapter.create([
      { name: 'Alice', age: null },
      { name: 'Bob', age: 30 },
      { name: 'Charlie' } // age undefined
    ])

    const nullResults = await adapter.find({
      query: {
        age: { $isNull: true }
      }
    })

    expect(nullResults.length).toBe(2) // null and undefined both match

    const notNullResults = await adapter.find({
      query: {
        age: { $isNull: false }
      }
    })

    expect(notNullResults.length).toBe(1)
    expect(notNullResults[0].name).toBe('Bob')

    await adapter.removeMany({ query: { name: { $in: ['Alice', 'Bob', 'Charlie'] } }, allowAll: false })
  })

  // Run centralized test suites
  commonTests(() => adapter as any, 'id', WINGS_CONFIG)
  wingsTests(() => adapter as any, 'id', WINGS_CONFIG)

  // Run tests for custom ID field
  commonTests(() => customIdAdapter as any, 'customid', WINGS_CONFIG)
  wingsTests(() => customIdAdapter as any, 'customid', WINGS_CONFIG)
})

describe('Feathers Memory Adapter (Compatibility)', () => {
  let adapter: FeathersMemoryAdapter<Person>
  let customIdAdapter: FeathersMemoryAdapter<Person>

  beforeAll(() => {
    adapter = new FeathersMemoryAdapter<Person>()
    customIdAdapter = new FeathersMemoryAdapter<Person>({
      id: 'customid'
    })
  })

  afterAll(async () => {
    // Clean up any remaining data
    await adapter.remove(null)
    await customIdAdapter.remove(null)
  })

  it('update with string id works', async () => {
    const person = await adapter.create({
      name: 'Tester',
      age: 33
    })

    const updatedPerson = await adapter.update(person.id!.toString(), person)

    expect(typeof updatedPerson.id).toBe('number')

    await adapter.remove(person.id!.toString())
  })

  it('update with null throws error', async () => {
    await expect(adapter.update(null as any, {})).rejects.toThrow(
      "You can not replace multiple instances. Did you mean 'patch'?"
    )
  })

  it('throws NotFound errors', async () => {
    await expect(adapter.get(999999)).rejects.toThrow('No record found for id')
    await expect(adapter.update(999999, { name: 'Test' })).rejects.toThrow('No record found for id')
    await expect(adapter.patch(999999, { name: 'Test' })).rejects.toThrow('No record found for id')
    await expect(adapter.remove(999999)).rejects.toThrow('No record found for id')
  })

  it('bulk operations work with null id', async () => {
    await adapter.create([
      { name: 'User 1', age: 25 },
      { name: 'User 2', age: 30 }
    ])

    const patched = await adapter.patch(null, { age: 35 })
    expect(patched.length).toBe(2)
    expect(patched.every((p) => p.age === 35)).toBe(true)

    const removed = await adapter.remove(null)
    expect(removed.length).toBe(2)
  })

  // Run centralized test suites
  commonTests(() => adapter as any, 'id', FEATHERS_CONFIG)
  feathersTests(() => adapter as any, 'id', FEATHERS_CONFIG)

  // Run tests for custom ID field
  commonTests(() => customIdAdapter as any, 'customid', FEATHERS_CONFIG)
  feathersTests(() => customIdAdapter as any, 'customid', FEATHERS_CONFIG)
})
