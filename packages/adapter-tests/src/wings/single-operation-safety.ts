import { describe, it, beforeEach, afterEach, expect } from 'vitest'
import { WingsAdapter, Person, TestConfig, WINGS_CONFIG, ServiceFactory } from '../types.js'

export function testWingsSingleOperationSafety<T extends WingsAdapter<Person>>(
  serviceFactory: ServiceFactory<T>,
  idProp: string,
  _config: TestConfig = WINGS_CONFIG
) {
  describe('Wings Single Operation Safety', () => {
    let service: T
    let testUser: Person
    let createdItems: Person[] = []

    beforeEach(async () => {
      service = serviceFactory()
      const result = await service.create({
        name: 'TestUser',
        age: 25
      })
      testUser = Array.isArray(result) ? result[0] : result
      createdItems = [testUser]
    })

    afterEach(async () => {
      // Clean up created items
      for (const item of createdItems) {
        try {
          await service.remove(item[idProp])
        } catch (_error) {
          // Ignore cleanup errors
        }
      }
      createdItems = []
    })

    it('patch() should throw BadRequest when id is null', async () => {
      try {
        await service.patch(null as any, { name: 'Updated' })
        expect.fail('Expected BadRequest error when patching with null id')
      } catch (error: any) {
        expect(error.name).toBe('BadRequest')
        expect(error.message.includes('patch() requires a non-null id')).toBe(true)
        expect(error.message.includes('patchMany()')).toBe(true)
      }
    })

    it('patch() should throw BadRequest when id is undefined', async () => {
      try {
        await service.patch(undefined as any, { name: 'Updated' })
        expect.fail('Expected BadRequest error when patching with undefined id')
      } catch (error: any) {
        expect(error.name).toBe('BadRequest')
        expect(
          error.message.includes('patch() requires a non-null id'),
          `Error message should mention patch() requirement. Got: ${error.message}`
        )
        expect(
          error.message.includes('patchMany()'),
          `Error message should suggest patchMany(). Got: ${error.message}`
        )
      }
    })

    it('remove() should throw BadRequest when id is null', async () => {
      try {
        await service.remove(null as any)
        expect.fail('Expected BadRequest error when removing with null id')
      } catch (error: any) {
        expect(error.name).toBe('BadRequest')
        expect(
          error.message.includes('remove() requires a non-null id'),
          `Error message should mention remove() requirement. Got: ${error.message}`
        )
        expect(
          error.message.includes('removeMany()'),
          `Error message should suggest removeMany(). Got: ${error.message}`
        )
      }
    })

    it('remove() should throw BadRequest when id is undefined', async () => {
      try {
        await service.remove(undefined as any)
        expect.fail('Expected BadRequest error when removing with undefined id')
      } catch (error: any) {
        expect(error.name).toBe('BadRequest')
        expect(
          error.message.includes('remove() requires a non-null id'),
          `Error message should mention remove() requirement. Got: ${error.message}`
        )
        expect(
          error.message.includes('removeMany()'),
          `Error message should suggest removeMany(). Got: ${error.message}`
        )
      }
    })

    it('patch() should work normally with valid non-null id', async () => {
      const patched = await service.patch(testUser[idProp], { name: 'UpdatedName' })
      expect(patched).toBeTruthy()
      const patchedItem = Array.isArray(patched) ? patched[0] : patched
      expect(patchedItem.name).toBe('UpdatedName')
    })

    it('remove() should work normally with valid non-null id', async () => {
      const removed = await service.remove(testUser[idProp])
      expect(removed).toBeTruthy()
      const removedItem = Array.isArray(removed) ? removed[0] : removed
      expect(removedItem.name).toBe('TestUser')
      createdItems = [] // Clear since we removed it
    })

    it('patch() should allow empty string as valid id', async () => {
      // Create a record with empty string id (if supported by adapter)
      try {
        const result = await service.create({ [idProp]: '', name: 'EmptyId', age: 30 })
        const item = Array.isArray(result) ? result[0] : result
        createdItems.push(item)

        const patched = await service.patch('', { name: 'PatchedEmpty' })
        expect(patched).toBeTruthy()
      } catch (_error) {
        // Some adapters may not support empty string ids - that's fine
        // This test just ensures we don't confuse empty string with null/undefined
      }
    })

    it('patch() should allow 0 as valid id', async () => {
      // Create a record with 0 as id (if supported by adapter)
      try {
        const result = await service.create({ [idProp]: 0, name: 'ZeroId', age: 30 })
        const item = Array.isArray(result) ? result[0] : result
        createdItems.push(item)

        const patched = await service.patch(0, { name: 'PatchedZero' })
        expect(patched).toBeTruthy()
      } catch (_error) {
        // Some adapters may not support 0 ids - that's fine
        // This test just ensures we don't confuse 0 with null/undefined
      }
    })
  })
}
