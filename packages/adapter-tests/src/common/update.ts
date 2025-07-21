import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'assert'
import { BaseAdapter, Person, TestConfig, COMMON_CONFIG } from '../types.js'

export function testUpdate<T extends BaseAdapter<Person>>(
  service: T,
  idProp: string,
  config: TestConfig = COMMON_CONFIG
) {
  describe('Update', () => {
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

    // Only include update tests if the adapter supports update method
    it('should update a record by id', async () => {
      if (!(service as any).update) {
        // Skip if update method doesn't exist (Wings adapters don't have update)
        return
      }

      const updated = await (service as any).update(doug[idProp], { name: 'Dougie', age: 33 })
      assert.ok(updated, 'Should return updated record')
      assert.strictEqual(updated.name, 'Dougie')
      assert.strictEqual(updated.age, 33)
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
      assert.ok(updated, 'Should return updated record')
      assert.strictEqual(updated.name, 'Dougie')
      assert.ok(updated[idProp], 'Should include id field')
      assert.strictEqual(updated.age, undefined, 'Should not include unselected fields')
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
      assert.ok(updated, 'Should return updated record when query matches')
      assert.strictEqual(updated.name, 'Dougie')
    })

    it('should handle not found appropriately', async () => {
      if (!(service as any).update) {
        return
      }

      const result = await (service as any).update('non-existent-id', { name: 'Updated', age: 99 })

      if (config.throwOnNotFound) {
        // Should be handled by error handling tests
      } else {
        assert.strictEqual(result, null, 'Should return null when not found')
      }
    })

    it('should handle query + not found', async () => {
      if (!(service as any).update) {
        return
      }

      const result = await (service as any).update(
        doug[idProp],
        { name: 'Updated', age: 99 },
        { query: { name: 'NotDoug' } }
      )

      if (config.throwOnNotFound) {
        // Should be handled by error handling tests
      } else {
        assert.strictEqual(result, null, "Should return null when query doesn't match")
      }
    })

    it('should handle id + query mismatch', async () => {
      if (!(service as any).update) {
        return
      }

      const aliceResult = await service.create({ name: 'Alice', age: 12 })
      const alice = Array.isArray(aliceResult) ? aliceResult[0] : aliceResult
      createdItems.push(alice)

      const updated = await (service as any).update(
        doug[idProp],
        { name: 'Updated', age: 99 },
        { query: { [idProp]: alice[idProp] } }
      )

      if (config.throwOnNotFound) {
        // Should be handled by error handling tests
        assert.strictEqual(updated, null, 'Should return null for mismatched query')
      } else {
        assert.strictEqual(updated, null, 'Should return null for mismatched query')
      }
    })
  })
}
