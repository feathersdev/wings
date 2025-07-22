import { describe, it, beforeEach, afterEach, expect } from 'vitest'
import { FeathersAdapter, Person, TestConfig, FEATHERS_CONFIG, ServiceFactory } from '../types.js'

export function testFeathersBulkOperations<T extends FeathersAdapter<Person>>(
  serviceFactory: ServiceFactory<T>,
  idProp: string,
  _config: TestConfig = FEATHERS_CONFIG
) {
  describe('FeathersJS Bulk Operations', () => {
    let service: T

    beforeEach(async () => {
      service = serviceFactory()
      const data = [
        { name: 'Alice', age: 25, created: true },
        { name: 'Bob', age: 30, created: true },
        { name: 'Charlie', age: 35, created: false }
      ]
      await service.create(data)
    })

    afterEach(async () => {
      // Clean up remaining items
      try {
        const remaining = await service.find({ paginate: false })
        const items = Array.isArray(remaining) ? remaining : remaining.data
        for (const item of items) {
          try {
            await service.remove(item[idProp])
          } catch (_error) {
            // Ignore cleanup errors
          }
        }
      } catch (_error) {
        // Ignore cleanup errors
      }
    })

    it('patch(null, data, params) should update multiple records', async () => {
      const result = await service.patch(null, { age: 99 }, { query: { created: true } })

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(2)
      result.forEach((item: any) => {
        expect(item.age).toBe(99)
      })
    })

    it('remove(null, params) should remove multiple records', async () => {
      const result = await service.remove(null, { query: { created: true } })

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(2)

      // Verify items were removed
      const remaining = await service.find({ paginate: false })
      const remainingData = Array.isArray(remaining) ? remaining : remaining.data
      expect(remainingData.length).toBe(1)
      expect(remainingData[0].name).toBe('Charlie')
    })

    it('patch(null, data) without query should update all records', async () => {
      const result = await service.patch(null, { age: 100 })

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(3)
      result.forEach((item: any) => {
        expect(item.age).toBe(100)
      })
    })

    it('remove(null) without query should remove all records', async () => {
      const result = await service.remove(null)

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(3)

      // Verify all items were removed
      const remaining = await service.find({ paginate: false })
      const remainingData = Array.isArray(remaining) ? remaining : remaining.data
      expect(remainingData.length).toBe(0)
    })

    it('patch(null, data) with complex queries should work', async () => {
      const result = await service.patch(null, { age: 77 }, { query: { name: { $in: ['Alice', 'Bob'] } } })

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(2)
      result.forEach((item: any) => {
        expect(item.age).toBe(77)
        expect(['Alice', 'Bob'].includes(item.name)).toBe(true)
      })
    })

    it('patch(null, data) with $gte query should work', async () => {
      const result = await service.patch(null, { age: 88 }, { query: { age: { $gte: 25 } } })

      expect(Array.isArray(result)).toBe(true)
      expect(result.length >= 3).toBe(true)
      result.forEach((item: any) => {
        expect(item.age).toBe(88)
      })
    })

    it('remove(null, params) with $gte query should work', async () => {
      const result = await service.remove(null, { query: { age: { $gte: 25 } } })

      expect(Array.isArray(result)).toBe(true)
      expect(result.length >= 3).toBe(true)

      // Verify items were removed
      const remaining = await service.find({ paginate: false })
      const remainingData = Array.isArray(remaining) ? remaining : remaining.data
      expect(remainingData.length).toBe(0)
    })

    it('patch(null, data) should handle paginate: false', async () => {
      const params = { query: { age: { $gte: 25 } }, paginate: false }
      const result = await service.patch(null, { age: 66 }, params)

      expect(Array.isArray(result)).toBe(true)
      expect(result.length >= 3).toBe(true)
      result.forEach((item: any) => {
        expect(item.age).toBe(66)
      })
    })

    it('remove(null, params) should handle paginate: false', async () => {
      const params = { query: { age: { $gte: 25 } }, paginate: false }
      const result = await service.remove(null, params)

      expect(Array.isArray(result)).toBe(true)
      expect(result.length >= 3).toBe(true)

      // Verify items were removed
      const remaining = await service.find({ paginate: false })
      const remainingData = Array.isArray(remaining) ? remaining : remaining.data
      expect(remainingData.length).toBe(0)
    })
  })
}
