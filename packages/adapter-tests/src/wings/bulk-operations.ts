import { describe, it, beforeEach, afterEach, expect } from 'vitest'
import { WingsAdapter, Person, TestConfig, WINGS_CONFIG, ServiceFactory } from '../types.js'

export function testWingsBulkOperations<T extends WingsAdapter<Person>>(
  serviceFactory: ServiceFactory<T>,
  idProp: string,
  _config: TestConfig = WINGS_CONFIG
) {
  describe('Wings Bulk Operations', () => {
    let service: T
    let testData: Person[] = []

    beforeEach(async () => {
      service = serviceFactory()
      const data = [
        { name: 'Alice', age: 25, created: true },
        { name: 'Bob', age: 30, created: true },
        { name: 'Charlie', age: 35, created: false }
      ]
      const result = await service.create(data)
      testData = Array.isArray(result) ? result : [result]
    })

    afterEach(async () => {
      try {
        await service.removeAll()
      } catch (_error) {
        // Try individual cleanup
        for (const item of testData) {
          try {
            await service.remove(item[idProp])
          } catch (_e) {
            // Ignore individual cleanup errors
          }
        }
      }
      testData = []
    })

    it('patchMany() should update multiple records with query', async () => {
      const result = await service.patchMany({ age: 99 }, { query: { created: true } })

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(2)
      result.forEach((item: any) => {
        expect(item.age).toBe(99)
      })
    })

    it('patchMany() should require query or allowAll flag', async () => {
      await expect(service.patchMany({ age: 100 }, {})).rejects.toMatchObject({
        message: expect.stringMatching(/No query provided.*allowAll/)
      })
    })

    it('patchMany() should update all records with allowAll: true', async () => {
      const result = await service.patchMany({ age: 100 }, { allowAll: true })

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(3)
      result.forEach((item: any) => {
        expect(item.age).toBe(100)
      })
    })

    it('removeMany() should remove multiple records with query', async () => {
      const result = await service.removeMany({ query: { created: true } })

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(2)

      // Verify items were removed
      const remaining = await service.find()
      const remainingData = Array.isArray(remaining) ? remaining : remaining.data
      expect(remainingData.length).toBe(1)
      expect(remainingData[0].name).toBe('Charlie')
    })

    it('removeMany() should require query or allowAll flag', async () => {
      await expect(service.removeMany({})).rejects.toMatchObject({
        message: expect.stringMatching(/No query provided.*allowAll/)
      })
    })

    it('removeAll() should remove all records', async () => {
      const result = await service.removeAll()

      expect(Array.isArray(result)).toBe(true)

      // Verify all items were removed
      const remaining = await service.find()
      const remainingData = Array.isArray(remaining) ? remaining : remaining.data
      expect(remainingData.length).toBe(0)
    })
  })
}
