import { describe, it, beforeEach, afterEach, expect } from 'vitest'
import { BaseAdapter, Person, TestConfig, COMMON_CONFIG, ServiceFactory } from '../types.js'

export function testUpdate<T extends BaseAdapter<Person>>(
  serviceFactory: ServiceFactory<T>,
  idProp: string,
  config: TestConfig = COMMON_CONFIG
) {
  describe('Update', () => {
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

    // Only include update tests if the adapter supports update method
    it('should update a record by id', async () => {
      if (!(service as any).update) {
        // Skip if update method doesn't exist (Wings adapters don't have update)
        return
      }

      const updated = await (service as any).update(doug[idProp], { name: 'Dougie', age: 33 })
      expect(updated).toBeTruthy()
      expect(updated.name).toBe('Dougie')
      expect(updated.age).toBe(33)
    })

    it('should support $select', async () => {
      if (!(service as any).update) {
        return
      }

      const updated = await (service as any).update(
        doug[idProp],
        { name: 'Dougie', age: 33 },
        { query: { $select: ['name'] } }
      )
      expect(updated).toBeTruthy()
      expect(updated.name).toBe('Dougie')
      expect(updated[idProp]).toBeTruthy()
      expect(updated.age).toBeUndefined()
    })

    it('should update with query', async () => {
      if (!(service as any).update) {
        return
      }

      const updated = await (service as any).update(
        doug[idProp],
        { name: 'Dougie', age: 33 },
        { query: { name: 'Doug' } }
      )
      expect(updated).toBeTruthy()
      expect(updated.name).toBe('Dougie')
    })

    it('should handle not found appropriately', async () => {
      if (!(service as any).update) {
        return
      }

      if (config.throwOnNotFound) {
        await expect(
          (service as any).update('non-existent-id', { name: 'Updated', age: 99 })
        ).rejects.toThrow()
      } else {
        const result = await (service as any).update('non-existent-id', { name: 'Updated', age: 99 })
        expect(result).toBe(null)
      }
    })

    it('should handle query + not found', async () => {
      if (!(service as any).update) {
        return
      }

      if (config.throwOnNotFound) {
        await expect(
          (service as any).update(doug[idProp], { name: 'Updated', age: 99 }, { query: { name: 'NotDoug' } })
        ).rejects.toThrow()
      } else {
        const result = await (service as any).update(
          doug[idProp],
          { name: 'Updated', age: 99 },
          { query: { name: 'NotDoug' } }
        )
        expect(result).toBe(null)
      }
    })

    it('should handle id + query mismatch', async () => {
      if (!(service as any).update) {
        return
      }

      const aliceResult = await service.create({ name: 'Alice', age: 12 })
      const alice = Array.isArray(aliceResult) ? aliceResult[0] : aliceResult
      createdItems.push(alice)

      if (config.throwOnNotFound) {
        await expect(
          (service as any).update(
            doug[idProp],
            { name: 'Updated', age: 99 },
            { query: { [idProp]: alice[idProp] } }
          )
        ).rejects.toThrow()
      } else {
        const updated = await (service as any).update(
          doug[idProp],
          { name: 'Updated', age: 99 },
          { query: { [idProp]: alice[idProp] } }
        )
        expect(updated).toBe(null)
      }
    })
  })
}
