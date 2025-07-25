import { describe, it, beforeEach, afterEach, expect } from 'vitest'
import { FeathersAdapter, Person, TestConfig, FEATHERS_CONFIG, ServiceFactory } from '../types.js'

export function testFeathersUpdate<T extends FeathersAdapter<Person>>(
  serviceFactory: ServiceFactory<T>,
  idProp: string,
  _config: TestConfig = FEATHERS_CONFIG
) {
  describe('FeathersJS Update Method', () => {
    let service: T
    let testItem: Person

    beforeEach(async () => {
      service = serviceFactory()
      const result = await service.create({ name: 'Test User', age: 25 })
      testItem = Array.isArray(result) ? result[0] : result
    })

    afterEach(async () => {
      try {
        await service.remove(testItem[idProp])
      } catch (_error) {
        // Ignore cleanup errors
      }
    })

    it('update() should replace entire record', async () => {
      const updateData = { name: 'Updated User', age: 99 }
      const result = await service.update(testItem[idProp], updateData)

      expect(result).toBeTruthy()
      expect(result.name).toBe('Updated User')
      expect(result.age).toBe(99)

      // Verify the record was actually updated
      const retrieved = await service.get(testItem[idProp])
      expect(retrieved.name).toBe('Updated User')
      expect(retrieved.age).toBe(99)
    })

    it('update() with $select should return only selected fields', async () => {
      const updateData = { name: 'Selected User', age: 88 }
      const result = await service.update(testItem[idProp], updateData, { query: { $select: ['name'] } })

      expect(result).toBeTruthy()
      expect(result.name).toBe('Selected User')
      expect(result[idProp]).toBeTruthy()
      expect(result.age).toBe(undefined)
    })
  })
}
