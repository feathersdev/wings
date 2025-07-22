import { describe, it, beforeEach, afterEach, expect } from 'vitest'
import { WingsAdapter, Person, TestConfig, WINGS_CONFIG, ServiceFactory } from '../types.js'

export function testWingsQueryOperators<T extends WingsAdapter<Person>>(
  serviceFactory: ServiceFactory<T>,
  idProp: string,
  _config: TestConfig = WINGS_CONFIG
) {
  describe('Wings Query Operators', () => {
    let service: T
    let testData: Person[] = []

    beforeEach(async () => {
      service = serviceFactory()
      const data = [
        { name: 'Alice', age: 25 },
        { name: 'Bob', age: null },
        { name: 'alice', age: 30 },
        { name: 'ALICE', age: 35 }
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

    if (WINGS_CONFIG.supportsLike) {
      it('should support $like operator', async () => {
        const result = await service.find({ query: { name: { $like: 'A%' } } })
        const data = Array.isArray(result) ? result : result.data

        expect(Array.isArray(data)).toBe(true)
        expect(data.length >= 2).toBe(true)
        const names = data.map((item: any) => item.name)
        expect(names.includes('Alice')).toBe(true)
        expect(names.includes('ALICE')).toBe(true)
      })
    }

    if (WINGS_CONFIG.supportsIlike) {
      it('should support $ilike operator (case insensitive)', async () => {
        const result = await service.find({ query: { name: { $ilike: 'alice' } } })
        const data = Array.isArray(result) ? result : result.data

        expect(Array.isArray(data)).toBe(true)
        expect(data.length).toBe(3)
        const names = data.map((item: any) => item.name).sort()
        expect(names).toEqual(['ALICE', 'Alice', 'alice'])
      })
    }

    if (WINGS_CONFIG.supportsIsNull) {
      it('should support $isNull operator', async () => {
        // Test $isNull: true
        const nullResult = await service.find({ query: { age: { $isNull: true } } })
        const nullData = Array.isArray(nullResult) ? nullResult : nullResult.data

        expect(Array.isArray(nullData)).toBe(true)
        expect(nullData.length).toBe(1)
        expect(nullData[0].name).toBe('Bob')

        // Test $isNull: false
        const notNullResult = await service.find({ query: { age: { $isNull: false } } })
        const notNullData = Array.isArray(notNullResult) ? notNullResult : notNullResult.data

        expect(Array.isArray(notNullData)).toBe(true)
        expect(notNullData.length).toBe(3)
      })
    }
  })
}
