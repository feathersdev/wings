import { describe, it, beforeEach, afterEach, expect } from 'vitest'
import { BaseAdapter, Person, TestConfig, ServiceFactory } from '../types.js'

/**
 * Test advanced query operators for adapters that support them
 * These tests verify SQL-like operators and complex logical operations
 */
export function testAdvancedQueryOperators<T extends BaseAdapter<Person>>(
  serviceFactory: ServiceFactory<T>,
  idProp: string,
  _config: TestConfig
) {
  describe('Advanced Query Operators', () => {
    let service: T

    beforeEach(async () => {
      service = serviceFactory()
      // Clean any existing data
      try {
        if ('removeAll' in service) {
          // Wings adapter
          await (service as any).removeAll()
        } else {
          // FeathersJS adapter - clean via find and remove
          const existing = await service.find({ paginate: false })
          if (Array.isArray(existing)) {
            for (const item of existing) {
              await service.remove(item[idProp])
            }
          }
        }
      } catch (_error) {
        // Ignore cleanup errors
      }
    })

    afterEach(async () => {
      // Clean up after each test
      try {
        if ('removeAll' in service) {
          // Wings adapter
          await (service as any).removeAll()
        } else {
          // FeathersJS adapter - clean via find and remove
          const existing = await service.find({ paginate: false })
          if (Array.isArray(existing)) {
            for (const item of existing) {
              await service.remove(item[idProp])
            }
          }
        }
      } catch (_error) {
        // Ignore cleanup errors
      }
    })

    describe('$like operator', () => {
      beforeEach(async () => {
        await service.create({
          name: 'Charlie Brown',
          age: 10
        })
      })

      it('should find records using $like pattern matching', async () => {
        const result = await service.find({
          paginate: false,
          query: { name: { $like: '%lie%' } } as any
        })

        const data = Array.isArray(result) ? result : result.data
        expect(data.length).toBe(1)
        expect(data[0].name).toBe('Charlie Brown')
      })

      it('should find records using $like prefix matching', async () => {
        const result = await service.find({
          paginate: false,
          query: { name: { $like: 'Char%' } } as any
        })

        const data = Array.isArray(result) ? result : result.data
        expect(data.length).toBe(1)
        expect(data[0].name).toBe('Charlie Brown')
      })

      it('should find records using $like suffix matching', async () => {
        const result = await service.find({
          paginate: false,
          query: { name: { $like: '%Brown' } } as any
        })

        const data = Array.isArray(result) ? result : result.data
        expect(data.length).toBe(1)
        expect(data[0].name).toBe('Charlie Brown')
      })
    })

    describe('$notlike operator', () => {
      beforeEach(async () => {
        await service.create({
          name: 'XYZabcZYX',
          age: 25
        })
        await service.create({
          name: 'XYZZYX',
          age: 30
        })
      })

      it('should exclude records using $notlike pattern matching', async () => {
        const result = await service.find({
          paginate: false,
          query: { name: { $notlike: '%abc%' } } as any
        })

        const data = Array.isArray(result) ? result : result.data
        expect(data.length).toBe(1)
        expect(data[0].name).toBe('XYZZYX')
      })
    })

    describe('Complex logical operators', () => {
      beforeEach(async () => {
        await service.create({
          name: 'Ageless',
          age: null
        })
        await service.create({
          name: 'Dave',
          age: 32
        })
        await service.create({
          name: 'Dada',
          age: 1
        })
      })

      it('should work with $or conditions properly', async () => {
        const result = await service.find({
          paginate: false,
          query: {
            name: 'Dave',
            $or: [{ age: 1 }, { age: 32 }]
          }
        })

        const data = Array.isArray(result) ? result : result.data
        expect(data.length).toBe(1)
        expect(data[0].name).toBe('Dave')
        expect(data[0].age).toBe(32)
      })

      it('should work with $and conditions properly', async () => {
        const result = await service.find({
          paginate: false,
          query: {
            $and: [
              {
                $or: [{ name: 'Dave' }, { name: 'Dada' }]
              },
              {
                age: { $lt: 23 }
              }
            ]
          }
        })

        const data = Array.isArray(result) ? result : result.data
        expect(data.length).toBe(1)
        expect(data[0].name).toBe('Dada')
        expect(data[0].age).toBe(1)
      })
    })

    describe('NULL value handling', () => {
      beforeEach(async () => {
        await service.create({
          name: 'Ageless',
          age: null
        })
        await service.create({
          name: 'Dave',
          age: 32
        })
        await service.create({
          name: 'Dada',
          age: 1
        })
      })

      it('should support NULL value queries', async () => {
        const result = await service.find({
          paginate: false,
          query: {
            age: null
          }
        })

        const data = Array.isArray(result) ? result : result.data
        expect(data.length).toBe(1)
        expect(data[0].name).toBe('Ageless')
        expect(data[0].age).toBe(null)
      })

      it('should support NOT NULL queries using $ne', async () => {
        const result = await service.find({
          paginate: false,
          query: {
            age: { $ne: null }
          }
        })

        const data = Array.isArray(result) ? result : result.data
        expect(data.length).toBe(2)
        expect(data.every((record: Person) => record.age !== null)).toBe(true)
        expect(data.some((record: Person) => record.name === 'Dave')).toBe(true)
        expect(data.some((record: Person) => record.name === 'Dada')).toBe(true)
      })

      it('should support NULL values within AND conditions', async () => {
        const result = await service.find({
          paginate: false,
          query: {
            age: null,
            name: 'Ageless'
          }
        })

        const data = Array.isArray(result) ? result : result.data
        expect(data.length).toBe(1)
        expect(data[0].name).toBe('Ageless')
        expect(data[0].age).toBe(null)
      })

      it('should support NULL values within OR conditions', async () => {
        const result = await service.find({
          paginate: false,
          query: {
            $or: [{ age: null }, { name: 'Dada' }]
          }
        })

        const data = Array.isArray(result) ? result : result.data
        expect(data.length).toBe(2)
        expect(data.some((record: Person) => record.name === 'Ageless' && record.age === null)).toBe(true)
        expect(data.some((record: Person) => record.name === 'Dada')).toBe(true)
        expect(data.every((record: Person) => record.name !== 'Dave')).toBe(true)
      })
    })
  })
}
