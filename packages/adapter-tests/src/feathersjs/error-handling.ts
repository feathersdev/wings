import { describe, it, beforeEach, afterEach, expect } from 'vitest'
import { FeathersAdapter, Person, TestConfig, FEATHERS_CONFIG, ServiceFactory } from '../types.js'

export function testFeathersErrorHandling<T extends FeathersAdapter<Person>>(
  serviceFactory: ServiceFactory<T>,
  idProp: string,
  config: TestConfig = FEATHERS_CONFIG
) {
  describe('FeathersJS Error Handling', () => {
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

    it('get() should throw NotFound for non-existent item', async () => {
      const nonExistentId = config.nonExistentId || 'non-existent-id'
      await expect(async () => {
        await service.get(nonExistentId)
      }).rejects.toMatchObject({ name: 'NotFound' })
    })

    it('patch() should throw NotFound for non-existent item', async () => {
      const nonExistentId = config.nonExistentId || 'non-existent-id'
      await expect(async () => {
        await service.patch(nonExistentId, { name: 'Updated' })
      }).rejects.toMatchObject({ name: 'NotFound' })
    })

    it('remove() should throw NotFound for non-existent item', async () => {
      const nonExistentId = config.nonExistentId || 'non-existent-id'
      await expect(async () => {
        await service.remove(nonExistentId)
      }).rejects.toMatchObject({ name: 'NotFound' })
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

      // Verify item was actually removed by checking it throws NotFound
      await expect(async () => {
        await service.get(testItem[idProp])
      }).rejects.toMatchObject({ name: 'NotFound' })
    })
  })
}
