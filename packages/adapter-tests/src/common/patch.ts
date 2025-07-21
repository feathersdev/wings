import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'assert'
import { BaseAdapter, Person, TestConfig, COMMON_CONFIG } from '../types.js'

export function testPatch<T extends BaseAdapter<Person>>(
  service: T,
  idProp: string,
  config: TestConfig = COMMON_CONFIG
) {
  describe('Patch', () => {
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

    it('should patch a record by id', async () => {
      const patched = await service.patch(doug[idProp], { name: 'Dougie' })
      assert.ok(patched, 'Should return patched record')
      const patchedItem = Array.isArray(patched) ? patched[0] : patched
      assert.strictEqual(patchedItem.name, 'Dougie')
      assert.strictEqual(patchedItem.age, 32, 'Should keep existing fields')
    })

    it('should support $select', async () => {
      const patched = await service.patch(doug[idProp], { name: 'Dougie' }, { query: { $select: ['name'] } })
      assert.ok(patched, 'Should return patched record')
      const patchedItem = Array.isArray(patched) ? patched[0] : patched
      assert.strictEqual(patchedItem.name, 'Dougie')
      assert.ok(patchedItem[idProp], 'Should include id field')
      assert.strictEqual(patchedItem.age, undefined, 'Should not include unselected fields')
    })

    it('should patch with query', async () => {
      const patched = await service.patch(doug[idProp], { name: 'Dougie' }, { query: { name: 'Doug' } })
      assert.ok(patched, 'Should return patched record when query matches')
      const patchedItem = Array.isArray(patched) ? patched[0] : patched
      assert.strictEqual(patchedItem.name, 'Dougie')
    })

    it('should handle not found appropriately', async () => {
      const result = await service.patch('non-existent-id', { name: 'Updated' })

      if (config.throwOnNotFound) {
        // Should be handled by error handling tests
      } else {
        assert.strictEqual(result, null, 'Should return null when not found')
      }
    })

    it('should handle id + query mismatch', async () => {
      const aliceResult = await service.create({ name: 'Alice', age: 12 })
      const alice = Array.isArray(aliceResult) ? aliceResult[0] : aliceResult
      createdItems.push(alice)

      const patched = await service.patch(
        doug[idProp],
        { name: 'Updated' },
        { query: { [idProp]: alice[idProp] } }
      )

      if (config.throwOnNotFound) {
        // Should be handled by error handling tests
        assert.strictEqual(patched, null, 'Should return null for mismatched query')
      } else {
        assert.strictEqual(patched, null, 'Should return null for mismatched query')
      }
    })
  })
}
