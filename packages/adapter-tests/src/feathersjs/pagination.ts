import { describe, it, beforeEach, afterEach, expect } from 'vitest'
import { FeathersAdapter, Person, TestConfig, FEATHERS_CONFIG, ServiceFactory } from '../types.js'

export function testFeathersPagination<T extends FeathersAdapter<Person>>(
  serviceFactory: ServiceFactory<T>,
  idProp: string,
  _config: TestConfig = FEATHERS_CONFIG
) {
  describe('FeathersJS Pagination', () => {
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

    it('should return Paginated object by default', async () => {
      const result = await service.find()

      expect(result && typeof result === 'object').toBe(true)
      expect(!Array.isArray(result)).toBe(true)
      expect(typeof result.total === 'number').toBe(true)
      expect(typeof result.limit === 'number').toBe(true)
      expect(typeof result.skip === 'number').toBe(true)
      expect(Array.isArray(result.data)).toBe(true)
      expect(result.data.length >= 3).toBe(true)
    })

    it('should return array when paginate: false', async () => {
      const result = await service.find({ paginate: false })

      expect(Array.isArray(result)).toBe(true)
      expect(result.length >= 3).toBe(true)
    })

    it('should return Paginated object when paginate: true', async () => {
      const result = await service.find({ paginate: true, query: { $sort: { name: 1 } } })

      expect(result && typeof result === 'object').toBe(true)
      expect(!Array.isArray(result)).toBe(true)
      expect(typeof result.total === 'number').toBe(true)
      expect(typeof result.limit === 'number').toBe(true)
      expect(typeof result.skip === 'number').toBe(true)
      expect(Array.isArray(result.data)).toBe(true)
      expect(result.data.length >= 3).toBe(true)
    })

    it('should paginate with $limit and $skip', async () => {
      const result = await service.find({
        query: { $limit: 2, $skip: 1, $sort: { name: 1 } }
      })

      expect(result.total).toBe(3)
      expect(result.limit).toBe(2)
      expect(result.skip).toBe(1)
      expect(result.data.length).toBe(2)
      expect(result.data[0].name).toBe('Bob')
    })
  })
}
