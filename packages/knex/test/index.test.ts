import { describe, it, beforeAll, afterAll, beforeEach, afterEach, expect } from 'vitest'
import { Person } from '@wingshq/adapter-tests'
import { KnexAdapter } from '../src'
import { ERROR } from '../src/error-handler'
import { setupCleanDatabase, createPeopleTable, TestDatabaseSetup } from './test-utils'

// Create a public database to mimic a "schema"
const schemaName = 'public'

let dbSetup: TestDatabaseSetup

const createPeopleService = () => {
  return new KnexAdapter<Person>({
    Model: dbSetup.db,
    name: 'people'
  })
}

type Todo = {
  id: number
  text: string
  personId: number
  personName: string
}

class TodoAdapter extends KnexAdapter<Todo> {
  createQuery(params: any) {
    const query = super.createQuery(params)
    
    // Apply join after base query is built
    query.join('people as person', 'todos.personId', 'person.id')
    
    // Add the personName to the existing select, don't clear it
    query.select('person.name as personName')

    return query
  }
}

const createTodosService = () => {
  return new TodoAdapter({
    Model: dbSetup.db,
    name: 'todos'
  })
}

const setupLegacyTables = async () => {
  // Create people table
  await createPeopleTable(dbSetup.db, 'people')

  // Create todos table
  await dbSetup.db.schema.dropTableIfExists('todos')
  await dbSetup.db.schema.createTable('todos', (table: any) => {
    table.increments('id')
    table.string('text')
    table.integer('personId')
    return table
  })

  // Create people-customid table
  await dbSetup.db.schema.dropTableIfExists('people-customid')
  await dbSetup.db.schema.createTable('people-customid', (table: any) => {
    table.increments('customid')
    table.string('name')
    table.integer('age')
    table.integer('time')
    table.boolean('created')
    return table
  })
}

describe('Knex Adapter Legacy Tests', () => {
  beforeAll(async () => {
    dbSetup = await setupCleanDatabase('legacy')

    // Handle SQLite schema attachment for legacy tests
    if (process.env.TEST_DB === 'sqlite' || !process.env.TEST_DB) {
      await dbSetup.db.schema.raw(`attach database '${schemaName}.sqlite' as ${schemaName}`)
    }

    await setupLegacyTables()
  })

  afterAll(async () => {
    await dbSetup.cleanup()
  })

  it('instantiated the adapter', () => {
    const people = createPeopleService()
    expect(people).toBeTruthy()
  })


  describe('adapter specifics', () => {
    let daves: Person[]
    let people: KnexAdapter<Person>

    beforeEach(async () => {
      people = createPeopleService()
      daves = await Promise.all([
        people.create({
          name: 'Ageless',
          age: null
        }),
        people.create({
          name: 'Dave',
          age: 32
        }),
        people.create({
          name: 'Dada',
          age: 1
        })
      ])
    })

    afterEach(async () => {
      try {
        if (daves[0]) await people.remove(daves[0].id)
        if (daves[1]) await people.remove(daves[1].id)
        if (daves[2]) await people.remove(daves[2].id)
      } catch (error: unknown) {
        console.error('Error in test cleanup:', error)
      }
    })


    it('attaches the SQL error', async () => {
      try {
        await people.create({})
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error[ERROR]).toBeTruthy()
      }
    })

    it('get by id works with `createQuery` as params.knex', async () => {
      const knex = people.createQuery()
      const dave = await people.get(daves[0].id, { knex })

      expect(dave).toEqual(daves[0])
    })
  })

  describe('associations', () => {
    it('create, query and get with associations, can unambigiously $select', async () => {
      const people = createPeopleService()
      const todos = createTodosService()

      const dave = await people.create({
        name: 'Dave',
        age: 133
      })
      const todo = await todos.create({
        text: 'Do dishes',
        personId: dave.id
      })

      const [found] = await todos.find({
        paginate: false,
        query: {
          'person.age': { $gt: 100 }
        } as any
      })
      const got = await todos.get(todo.id)

      expect(
        await todos.get(todo.id, {
          query: { $select: ['id', 'text'] }
        })
      ).toEqual({
        id: todo.id,
        text: todo.text,
        personName: 'Dave'
      })
      expect(got?.personName).toBe(dave.name)
      expect(got).toEqual(todo)
      expect(found).toEqual(todo)

      // Clean up using Wings removeAll
      await people.removeAll()
      await todos.removeAll()
    })
  })
})
