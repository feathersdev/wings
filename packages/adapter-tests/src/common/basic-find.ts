import { describe, it, beforeEach, afterEach, expect } from 'vitest'
import { BaseAdapter, Person, TestConfig, COMMON_CONFIG, ServiceFactory } from '../types.js'

export function testBasicFind<T extends BaseAdapter<Person>>(
  serviceFactory: ServiceFactory<T>,
  idProp: string,
  config: TestConfig = COMMON_CONFIG
) {
  describe('Basic Find', () => {
    let service: T
    let testData: Person[] = []

    beforeEach(async () => {
      service = serviceFactory()
      // Create test data
      const data = [
        { name: 'Alice', age: 25 },
        { name: 'Bob', age: 30 },
        { name: 'Charlie', age: 35 }
      ]
      const result = await service.create(data)
      testData = Array.isArray(result) ? result : [result]
    })

    afterEach(async () => {
      // Clean up test data
      for (const item of testData) {
        try {
          await service.remove(item[idProp])
        } catch (_error) {
          // Ignore cleanup errors
        }
      }
      testData = []
    })

    it('should find all items', async () => {
      const result = await service.find()
      const data = config.alwaysPaginate ? (result as any).data : result

      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBeGreaterThanOrEqual(3)
    })

    it('should find items with query', async () => {
      const result = await service.find({ query: { name: 'Alice' } })
      const data = config.alwaysPaginate ? (result as any).data : result

      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBe(1)
      expect(data[0].name).toBe('Alice')
    })

    it('should support $limit', async () => {
      const result = await service.find({ query: { $limit: 2 } })
      const data = config.alwaysPaginate ? (result as any).data : result

      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBe(2)
    })

    it('should support $skip', async () => {
      const result = await service.find({ query: { $skip: 1, $sort: { name: 1 } } })
      const data = config.alwaysPaginate ? (result as any).data : result

      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBeGreaterThanOrEqual(2)
      expect(data[0].name).not.toBe('Alice')
    })

    it('should support $sort ascending', async () => {
      const result = await service.find({ query: { $sort: { name: 1 } } })
      const data = config.alwaysPaginate ? (result as any).data : result

      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBeGreaterThanOrEqual(3)
      expect(data[0].name).toBe('Alice')
      expect(data[1].name).toBe('Bob')
      expect(data[2].name).toBe('Charlie')
    })

    it('should support $sort descending', async () => {
      const result = await service.find({ query: { $sort: { name: -1 } } })
      const data = config.alwaysPaginate ? (result as any).data : result

      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBeGreaterThanOrEqual(3)
      expect(data[0].name).toBe('Charlie')
      expect(data[1].name).toBe('Bob')
      expect(data[2].name).toBe('Alice')
    })

    it('should support $select', async () => {
      const result = await service.find({ query: { name: 'Alice', $select: ['name'] } })
      const data = config.alwaysPaginate ? (result as any).data : result

      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBe(1)
      expect(data[0].name).toBe('Alice')
      expect(data[0][idProp]).toBeDefined()
      expect(data[0].age).toBeUndefined()
    })
  })
}
