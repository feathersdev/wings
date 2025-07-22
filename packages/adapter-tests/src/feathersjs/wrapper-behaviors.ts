import { describe, it, beforeEach, expect } from 'vitest'
import { FeathersAdapter, Person, TestConfig, FEATHERS_CONFIG, ServiceFactory } from '../types.js'

export function testFeathersWrapperBehaviors<T extends FeathersAdapter<Person>>(
  serviceFactory: ServiceFactory<T>,
  idProp: string,
  _config: TestConfig = FEATHERS_CONFIG
) {
  describe('FeathersJS wrapper behaviors', () => {
    let service: T

    beforeEach(async () => {
      service = serviceFactory()
      // Clean any existing data
      try {
        const existing = await service.find({ paginate: false })
        if (Array.isArray(existing) && existing.length > 0) {
          for (const item of existing) {
            await service.remove(item[idProp])
          }
        }
      } catch (_error) {
        // Ignore cleanup errors
      }
    })

    it('should paginate by default for find()', async () => {
      // Create test data
      await service.create([
        { name: 'Alice', age: 25 },
        { name: 'Bob', age: 30 }
      ])

      // Without params, should paginate
      const result1 = await service.find()
      expect(result1 && typeof result1 === 'object' && 'data' in result1).toBe(true)
      expect((result1 as any).total).toBe(2)
      expect((result1 as any).data.length).toBe(2)

      // With empty params, should paginate
      const result2 = await service.find({})
      expect(result2 && typeof result2 === 'object' && 'data' in result2).toBe(true)
      expect((result2 as any).total).toBe(2)

      // With paginate: false, should return array
      const result3 = await service.find({ paginate: false })
      expect(Array.isArray(result3)).toBe(true)
      expect((result3 as any[]).length).toBe(2)
    })

    it('should support bulk patch with id: null', async () => {
      // Create test data
      await service.create([
        { name: 'Alice', age: 25 },
        { name: 'Bob', age: 30 }
      ])

      // Bulk patch with id: null
      const result = await service.patch(null, { age: 35 }, {})
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(2)
      expect(result.every((r: any) => r.age === 35)).toBe(true)
    })

    it('should support bulk remove with id: null', async () => {
      // Create test data
      await service.create([
        { name: 'Alice', age: 25 },
        { name: 'Bob', age: 30 }
      ])

      // Bulk remove with id: null
      const result = await service.remove(null, {})
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(2)

      // Verify all removed
      const remaining = await service.find({ paginate: false })
      expect(Array.isArray(remaining)).toBe(true)
      expect((remaining as any[]).length).toBe(0)
    })

    it('should have an update method', async () => {
      // Create test data
      const created = await service.create({ name: 'Alice', age: 25 })

      // Update the record - need to cast to handle varying id prop types
      const createdRecord = Array.isArray(created) ? created[0] : created
      const updated = await service.update((createdRecord as any)[idProp], {
        [idProp]: (createdRecord as any)[idProp],
        name: 'Alice Updated',
        age: 26,
        email: 'alice@example.com',
        created: (createdRecord as any).created
      } as any)

      expect(updated.name).toBe('Alice Updated')
      expect(updated.age).toBe(26)
      expect((updated as any).email).toBe('alice@example.com')
    })
  })
}