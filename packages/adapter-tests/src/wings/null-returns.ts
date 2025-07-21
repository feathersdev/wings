import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'assert'
import { WingsAdapter, Person, TestConfig, WINGS_CONFIG } from '../types.js'

export function testWingsNullReturns<T extends WingsAdapter<Person>>(
  service: T,
  idProp: string,
  _config: TestConfig = WINGS_CONFIG
) {
  describe('Wings Null Returns', () => {
    let testItem: Person

    beforeEach(async () => {
      const result = await service.create({ name: 'Test User', age: 25 })
      testItem = Array.isArray(result) ? result[0] : result
    })

    afterEach(async () => {
      try {
        await service.remove(testItem[idProp])
      } catch (error) {
        // Ignore cleanup errors
      }
    })

    it('get() should return null for non-existent item', async () => {
      const result = await service.get('non-existent-id')
      assert.strictEqual(result, null, 'Should return null for non-existent item')
    })

    it('patch() should return null for non-existent item', async () => {
      const result = await service.patch('non-existent-id', { name: 'Updated' })
      assert.strictEqual(result, null, 'Should return null for non-existent item')
    })

    it('remove() should return null for non-existent item', async () => {
      const result = await service.remove('non-existent-id')
      assert.strictEqual(result, null, 'Should return null for non-existent item')
    })

    it('get() should return item when found', async () => {
      const result = await service.get(testItem[idProp])
      assert.ok(result, 'Should return item when found')
      assert.strictEqual((result as Person).name, 'Test User')
    })

    it('patch() should return updated item when found', async () => {
      const result = await service.patch(testItem[idProp], { name: 'Updated User' })
      assert.ok(result, 'Should return updated item')
      assert.strictEqual((result as Person).name, 'Updated User')
    })

    it('remove() should return removed item when found', async () => {
      const result = await service.remove(testItem[idProp])
      assert.ok(result, 'Should return removed item')
      assert.strictEqual((result as Person).name, 'Test User')

      // Verify item was actually removed
      const checkResult = await service.get(testItem[idProp])
      assert.strictEqual(checkResult, null, 'Item should be removed')
    })
  })
}
