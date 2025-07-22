import { describe, it, beforeEach, afterEach, expect } from 'vitest'
import { WingsAdapter, Person, TestConfig, WINGS_CONFIG, ServiceFactory } from '../types.js'

export function testWingsPagination<T extends WingsAdapter<Person>>(
  serviceFactory: ServiceFactory<T>,
  idProp: string,
  _config: TestConfig = WINGS_CONFIG
) {
  describe('Wings Pagination', () => {
    let service: T
    let testData: Person[] = []

    beforeEach(async () => {
      service = serviceFactory()
      const data = [
        { name: 'Alice', age: 25 },
        { name: 'Bob', age: 30 },
        { name: 'Charlie', age: 35 }
      ]
      const result = await service.create(data)
      testData = Array.isArray(result) ? result : [result]
    })

    afterEach(async () => {
      for (const item of testData) {
        try {
          await service.remove(item[idProp])
        } catch (_error) {
          // Ignore cleanup errors
        }
      }
      testData = []
    })

    it('should return array by default (no paginate param)', async () => {
      const result = await service.find()

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThanOrEqual(3)
      expect(typeof result[0]).toBe('object')
    })

    it('should return array when paginate: false', async () => {
      const result = await service.find({ paginate: false })

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThanOrEqual(3)
    })

    it('should return Paginated object when paginate: true', async () => {
      const result = await service.find({ paginate: true, query: { $sort: { name: 1 } } })

      console.log('=== WINGS PAGINATION DEBUG ===')
      console.log('result:', result)
      console.log('typeof result:', typeof result)
      console.log('Array.isArray(result):', Array.isArray(result))
      if (result && typeof result === 'object' && !Array.isArray(result)) {
        console.log('result.total:', result.total)
        console.log('typeof result.total:', typeof result.total)
        console.log('result.limit:', result.limit)
        console.log('typeof result.limit:', typeof result.limit)
        console.log('result.skip:', result.skip)
        console.log('typeof result.skip:', typeof result.skip)
        console.log('result.data:', result.data)
        console.log('result.data.length:', result.data?.length)
      }

      expect(result && typeof result === 'object').toBe(true)
      expect(Array.isArray(result)).toBe(false)
      expect(typeof result.total).toBe('number')
      expect(typeof result.limit).toBe('number')
      expect(typeof result.skip).toBe('number')
      expect(Array.isArray(result.data)).toBe(true)
      expect(result.data.length).toBeGreaterThanOrEqual(3)
    })

    it('should paginate with $limit and $skip', async () => {
      const result = await service.find({
        paginate: true,
        query: { $limit: 2, $skip: 1, $sort: { name: 1 } }
      })

      expect(result.total).toBe(3)
      expect(result.limit).toBe(2)
      expect(result.skip).toBe(1)
      expect(result.data.length).toBe(2)
      expect(result.data[0].name).toBe('Bob')
    })

    it('should respect query filters in pagination total count', async () => {
      const result = await service.find({
        paginate: true,
        query: { age: { $gte: 30 } }
      })

      expect(result.total).toBe(2)
      expect(result.data.length).toBe(2)
    })
  })
}
