import { describe, it, beforeEach, afterEach, expect } from 'vitest'
import { BaseAdapter, Person, TestConfig, COMMON_CONFIG, ServiceFactory } from '../types.js'

export function testBasicQueryOperators<T extends BaseAdapter<Person>>(
  serviceFactory: ServiceFactory<T>,
  idProp: string,
  config: TestConfig = COMMON_CONFIG
) {
  describe('Basic Query Operators', () => {
    let service: T
    let testData: Person[] = []

    beforeEach(async () => {
      service = serviceFactory()
      const data = [
        { name: 'Alice', age: 25 },
        { name: 'Bob', age: 30 },
        { name: 'Charlie', age: 35 },
        { name: 'David', age: 25 }
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

    it('should support $in', async () => {
      const result = await service.find({ query: { name: { $in: ['Alice', 'Bob'] } } })
      const data = config.alwaysPaginate ? (result as any).data : result

      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBe(2)
      const names = data.map((item: any) => item.name).sort()
      expect(names).toEqual(['Alice', 'Bob'])
    })

    it('should support $nin', async () => {
      const result = await service.find({ query: { name: { $nin: ['Alice', 'Bob'] } } })
      const data = config.alwaysPaginate ? (result as any).data : result

      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBe(2)
      const names = data.map((item: any) => item.name).sort()
      expect(names).toEqual(['Charlie', 'David'])
    })

    it('should support $lt', async () => {
      const result = await service.find({ query: { age: { $lt: 30 } } })
      const data = config.alwaysPaginate ? (result as any).data : result

      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBe(2) // Alice and David (age 25)
    })

    it('should support $lte', async () => {
      const result = await service.find({ query: { age: { $lte: 30 } } })
      const data = config.alwaysPaginate ? (result as any).data : result

      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBe(3) // Alice, Bob, and David
    })

    it('should support $gt', async () => {
      const result = await service.find({ query: { age: { $gt: 30 } } })
      const data = config.alwaysPaginate ? (result as any).data : result

      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBe(1) // Charlie (age 35)
      expect(data[0].name).toBe('Charlie')
    })

    it('should support $gte', async () => {
      const result = await service.find({ query: { age: { $gte: 30 } } })
      const data = config.alwaysPaginate ? (result as any).data : result

      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBe(2) // Bob and Charlie
    })

    it('should support $ne', async () => {
      const result = await service.find({ query: { age: { $ne: 25 } } })
      const data = config.alwaysPaginate ? (result as any).data : result

      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBe(2) // Bob and Charlie
    })

    it('should support $or', async () => {
      const result = await service.find({
        query: {
          $or: [{ name: 'Alice' }, { age: 35 }]
        }
      })
      const data = config.alwaysPaginate ? (result as any).data : result

      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBe(2) // Alice and Charlie
    })

    it('should support $and', async () => {
      const result = await service.find({
        query: {
          $and: [{ age: 25 }, { name: 'Alice' }]
        }
      })
      const data = config.alwaysPaginate ? (result as any).data : result

      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBe(1)
      expect(data[0].name).toBe('Alice')
    })
  })
}
