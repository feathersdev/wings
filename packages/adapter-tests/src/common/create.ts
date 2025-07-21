import { describe, it, afterEach } from 'node:test'
import assert from 'assert'
import { BaseAdapter, Person, TestConfig, COMMON_CONFIG } from '../types.js'

export function testCreate<T extends BaseAdapter<Person>>(
  service: T,
  idProp: string,
  _config: TestConfig = COMMON_CONFIG
) {
  describe('Create', () => {
    let createdItems: Person[] = []

    afterEach(async () => {
      // Clean up created items
      for (const item of createdItems) {
        try {
          await service.remove(item[idProp])
        } catch (error) {
          // Ignore cleanup errors
        }
      }
      createdItems = []
    })

    it('should create a single item', async () => {
      const data = { name: 'Test User', age: 25 }
      const result = await service.create(data)

      assert.ok(result, 'Result should exist')
      const item = Array.isArray(result) ? result[0] : result
      assert.strictEqual(item.name, 'Test User')
      assert.strictEqual(item.age, 25)
      assert.ok(item[idProp], 'Should have id property')

      createdItems.push(item)
    })

    it('should create multiple items', async () => {
      const data = [
        { name: 'User 1', age: 20 },
        { name: 'User 2', age: 30 }
      ]
      const result = await service.create(data)

      assert.ok(Array.isArray(result), 'Result should be an array')
      assert.strictEqual(result.length, 2)
      assert.strictEqual(result[0].name, 'User 1')
      assert.strictEqual(result[1].name, 'User 2')

      createdItems.push(...result)
    })
  })
}
