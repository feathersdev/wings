import { describe, it, beforeEach, afterEach, expect } from 'vitest'
import { BaseAdapter, Person, TestConfig, COMMON_CONFIG, ServiceFactory } from '../types.js'

export function testCreate<T extends BaseAdapter<Person>>(
  serviceFactory: ServiceFactory<T>,
  idProp: string,
  _config: TestConfig = COMMON_CONFIG
) {
  describe('Create', () => {
    let service: T
    let createdItems: Person[] = []

    beforeEach(() => {
      service = serviceFactory()
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

    it('should create a single item', async () => {
      const data = { name: 'Test User', age: 25 }
      const result = await service.create(data)

      expect(result).toBeDefined()
      const item = Array.isArray(result) ? result[0] : result
      expect(item.name).toBe('Test User')
      expect(item.age).toBe(25)
      expect(item[idProp]).toBeDefined()

      createdItems.push(item)
    })

    it('should create multiple items', async () => {
      const data = [
        { name: 'User 1', age: 20 },
        { name: 'User 2', age: 30 }
      ]
      const result = await service.create(data)

      expect(Array.isArray(result)).toBe(true)
      expect((result as any[]).length).toBe(2)
      expect((result as any[])[0].name).toBe('User 1')
      expect((result as any[])[1].name).toBe('User 2')

      createdItems.push(...(result as any[]))
    })
  })
}
