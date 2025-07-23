import { describe, it, beforeEach, afterEach, expect } from 'vitest'
import { BaseAdapter, Person, TestConfig, COMMON_CONFIG, ServiceFactory } from '../types.js'

export function testGet<T extends BaseAdapter<Person>>(
  serviceFactory: ServiceFactory<T>,
  idProp: string,
  config: TestConfig = COMMON_CONFIG
) {
  describe('Get', () => {
    let service: T
    let doug: Person

    beforeEach(async () => {
      service = serviceFactory()
      const result = await service.create({
        name: 'Doug',
        age: 32
      })
      doug = Array.isArray(result) ? result[0] : result
    })

    afterEach(async () => {
      try {
        await service.remove(doug[idProp])
      } catch (_error: any) {
        // Ignore cleanup errors
      }
    })

    it('should get a record by id', async () => {
      const data = await service.get(doug[idProp])
      expect(data?.[idProp].toString()).toBe(doug[idProp].toString())
      expect(data?.name).toBe('Doug')
      expect(data?.age).toBe(32)
    })

    it('should support $select', async () => {
      const data = await service.get(doug[idProp], {
        query: { $select: ['name'] }
      })
      expect(data?.[idProp].toString()).toBe(doug[idProp].toString())
      expect(data?.name).toBe('Doug')
      expect(data?.age).toBeUndefined()
    })

    it('should get with id and query', async () => {
      const result = await service.get(doug[idProp], {
        query: { name: 'Doug' }
      })
      expect(result).toBeTruthy()
      expect(result?.name).toBe('Doug')
    })

    it('should return appropriate result when not found', async () => {
      const nonExistentId = config.nonExistentId || '568225fbfe21222432e836ff'
      if (config.throwOnNotFound) {
        await expect(service.get(nonExistentId)).rejects.toThrow()
      } else {
        const result = await service.get(nonExistentId)
        expect(result).toBe(null)
      }
    })

    it('should handle id + query mismatch', async () => {
      const aliceResult = await service.create({
        name: 'Alice',
        age: 12
      })
      const alice = Array.isArray(aliceResult) ? aliceResult[0] : aliceResult

      const query = { [idProp]: alice[idProp] }
      // querying by doug's id with alice's id in query should return null or throw
      if (config.throwOnNotFound) {
        await expect(service.get(doug[idProp], { query })).rejects.toThrow()
      } else {
        const result = await service.get(doug[idProp], { query })
        expect(result).toBe(null)
      }

      await service.remove(alice[idProp])
    })
  })
}
