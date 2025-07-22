import { describe, it, beforeEach, afterEach, expect } from 'vitest'
import { BaseAdapter, Person, TestConfig, COMMON_CONFIG, ServiceFactory } from '../types.js'

export function testRemove<T extends BaseAdapter<Person>>(
  serviceFactory: ServiceFactory<T>,
  idProp: string,
  config: TestConfig = COMMON_CONFIG
) {
  describe('Remove', () => {
    let service: T
    let doug: Person
    let createdItems: Person[] = []

    beforeEach(async () => {
      service = serviceFactory()
      const result = await service.create({
        name: 'Doug',
        age: 32
      })
      doug = Array.isArray(result) ? result[0] : result
      createdItems = [doug]
    })

    afterEach(async () => {
      for (const item of createdItems) {
        try {
          await service.remove(item[idProp])
        } catch (_error: any) {
          // Ignore cleanup errors
        }
      }
      createdItems = []
    })

    it('should remove a record by id', async () => {
      const removed = await service.remove(doug[idProp])
      expect(removed).toBeTruthy()
      const removedItem = Array.isArray(removed) ? removed[0] : removed
      expect(removedItem?.name).toBe('Doug')

      // Verify it's actually removed
      if (config.throwOnNotFound) {
        await expect(service.get(doug[idProp])).rejects.toThrow()
      } else {
        const result = await service.get(doug[idProp])
        expect(result).toBe(null)
      }
      createdItems = [] // Clear since we removed it
    })

    it('should support $select', async () => {
      const removed = await service.remove(doug[idProp], { query: { $select: ['name'] } })
      expect(removed).toBeTruthy()
      const removedItem = Array.isArray(removed) ? removed[0] : removed
      expect(removedItem?.name).toBe('Doug')
      expect(removedItem?.[idProp]).toBeTruthy()
      expect(removedItem?.age).toBeUndefined()
      createdItems = [] // Clear since we removed it
    })

    it('should remove with query', async () => {
      const removed = await service.remove(doug[idProp], { query: { name: 'Doug' } })
      expect(removed).toBeTruthy()
      const removedItem = Array.isArray(removed) ? removed[0] : removed
      expect(removedItem?.name).toBe('Doug')
      createdItems = [] // Clear since we removed it
    })

    it('should handle id + query mismatch', async () => {
      const aliceResult = await service.create({ name: 'Alice', age: 12 })
      const alice = Array.isArray(aliceResult) ? aliceResult[0] : aliceResult
      createdItems.push(alice)

      if (config.throwOnNotFound) {
        await expect(service.remove(doug[idProp], { query: { [idProp]: alice[idProp] } })).rejects.toThrow()
      } else {
        const removed = await service.remove(doug[idProp], { query: { [idProp]: alice[idProp] } })
        expect(removed).toBe(null)
      }
    })
  })
}
