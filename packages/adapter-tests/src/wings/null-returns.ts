import { describe, it, beforeEach, afterEach, expect } from 'vitest'
import { WingsAdapter, Person, TestConfig, WINGS_CONFIG, ServiceFactory } from '../types.js'

export function testWingsNullReturns<T extends WingsAdapter<Person>>(
  serviceFactory: ServiceFactory<T>,
  idProp: string,
  config: TestConfig = WINGS_CONFIG
) {
  describe('Wings Null Returns', () => {
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

    it('get() should return null for non-existent item', async () => {
      const nonExistentId = config.nonExistentId || 'non-existent-id'
      const result = await service.get(nonExistentId)
      expect(result).toBe(null)
    })

    it('patch() should return null for non-existent item', async () => {
      const nonExistentId = config.nonExistentId || 'non-existent-id'
      const result = await service.patch(nonExistentId, { name: 'Updated' })
      expect(result).toBe(null)
    })

    it('remove() should return null for non-existent item', async () => {
      const nonExistentId = config.nonExistentId || 'non-existent-id'
      const result = await service.remove(nonExistentId)
      expect(result).toBe(null)
    })

    it('get() should return item when found', async () => {
      const result = await service.get(testItem[idProp])
      expect(result).toBeTruthy()
      expect((result as Person).name).toBe('Test User')
    })

    it('patch() should return updated item when found', async () => {
      const result = await service.patch(testItem[idProp], { name: 'Updated User' })
      expect(result).toBeTruthy()
      expect((result as Person).name).toBe('Updated User')
    })

    it('remove() should return removed item when found', async () => {
      const result = await service.remove(testItem[idProp])
      expect(result).toBeTruthy()
      expect((result as Person).name).toBe('Test User')

      // Verify item was actually removed
      const checkResult = await service.get(testItem[idProp])
      expect(checkResult).toBe(null)
    })
  })
}
