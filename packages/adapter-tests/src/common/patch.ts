import { describe, it, beforeEach, afterEach, expect } from 'vitest'
import { BaseAdapter, Person, TestConfig, COMMON_CONFIG, ServiceFactory } from '../types.js'

export function testPatch<T extends BaseAdapter<Person>>(
  serviceFactory: ServiceFactory<T>,
  idProp: string,
  config: TestConfig = COMMON_CONFIG
) {
  describe('Patch', () => {
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

    it('should patch a record by id', async () => {
      const patched = await service.patch(doug[idProp], { name: 'Dougie' })
      expect(patched).toBeTruthy()
      const patchedItem = Array.isArray(patched) ? patched[0] : patched
      expect(patchedItem?.name).toBe('Dougie')
      expect(patchedItem?.age).toBe(32)
    })

    it('should support $select', async () => {
      const patched = await service.patch(doug[idProp], { name: 'Dougie' }, { query: { $select: ['name'] } })
      expect(patched).toBeTruthy()
      const patchedItem = Array.isArray(patched) ? patched[0] : patched
      expect(patchedItem?.name).toBe('Dougie')
      expect(patchedItem?.[idProp]).toBeTruthy()
      expect(patchedItem?.age).toBeUndefined()
    })

    it('should patch with query', async () => {
      const patched = await service.patch(doug[idProp], { name: 'Dougie' }, { query: { name: 'Doug' } })
      expect(patched).toBeTruthy()
      const patchedItem = Array.isArray(patched) ? patched[0] : patched
      expect(patchedItem?.name).toBe('Dougie')
    })

    it('should handle not found appropriately', async () => {
      const nonExistentId = config.nonExistentId || 'non-existent-id'
      if (config.throwOnNotFound) {
        await expect(service.patch(nonExistentId, { name: 'Updated' })).rejects.toThrow()
      } else {
        const result = await service.patch(nonExistentId, { name: 'Updated' })
        expect(result).toBe(null)
      }
    })

    it('should handle id + query mismatch', async () => {
      const aliceResult = await service.create({ name: 'Alice', age: 12 })
      const alice = Array.isArray(aliceResult) ? aliceResult[0] : aliceResult
      createdItems.push(alice)

      if (config.throwOnNotFound) {
        await expect(
          service.patch(doug[idProp], { name: 'Updated' }, { query: { [idProp]: alice[idProp] } })
        ).rejects.toThrow()
      } else {
        const patched = await service.patch(
          doug[idProp],
          { name: 'Updated' },
          { query: { [idProp]: alice[idProp] } }
        )
        expect(patched).toBe(null)
      }
    })
  })
}
