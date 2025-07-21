import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'assert'
import { BaseAdapter, Person, TestConfig, COMMON_CONFIG } from '../types.js'

export function testRemove<T extends BaseAdapter<Person>>(
  service: T,
  idProp: string,
  config: TestConfig = COMMON_CONFIG
) {
  describe('Remove', () => {
    let doug: Person
    let createdItems: Person[] = []

    beforeEach(async () => {
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
        } catch (error: any) {}
      }
      createdItems = []
    })

    it('should remove a record by id', async () => {
      const removed = await service.remove(doug[idProp])
      assert.ok(removed, 'Should return removed record')
      const removedItem = Array.isArray(removed) ? removed[0] : removed
      assert.strictEqual(removedItem.name, 'Doug')

      // Verify it's actually removed
      const result = await service.get(doug[idProp])
      if (config.throwOnNotFound) {
        // Should be handled by error handling tests
      } else {
        assert.strictEqual(result, null, 'Record should be removed')
      }
      createdItems = [] // Clear since we removed it
    })

    it('should support $select', async () => {
      const removed = await service.remove(doug[idProp], { query: { $select: ['name'] } })
      assert.ok(removed, 'Should return removed record')
      const removedItem = Array.isArray(removed) ? removed[0] : removed
      assert.strictEqual(removedItem.name, 'Doug')
      assert.ok(removedItem[idProp], 'Should include id field')
      assert.strictEqual(removedItem.age, undefined, 'Should not include unselected fields')
      createdItems = [] // Clear since we removed it
    })

    it('should remove with query', async () => {
      const removed = await service.remove(doug[idProp], { query: { name: 'Doug' } })
      assert.ok(removed, 'Should return removed record when query matches')
      const removedItem = Array.isArray(removed) ? removed[0] : removed
      assert.strictEqual(removedItem.name, 'Doug')
      createdItems = [] // Clear since we removed it
    })

    it('should handle id + query mismatch', async () => {
      const aliceResult = await service.create({ name: 'Alice', age: 12 })
      const alice = Array.isArray(aliceResult) ? aliceResult[0] : aliceResult
      createdItems.push(alice)

      const removed = await service.remove(doug[idProp], { query: { [idProp]: alice[idProp] } })

      if (config.throwOnNotFound) {
        // Should be handled by error handling tests
        assert.strictEqual(removed, null, 'Should return null for mismatched query')
      } else {
        assert.strictEqual(removed, null, 'Should return null for mismatched query')
      }
    })
  })
}
