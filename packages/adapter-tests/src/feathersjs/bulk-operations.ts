import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'assert'
import { FeathersAdapter, Person, TestConfig, FEATHERS_CONFIG } from '../types.js'

export function testFeathersBulkOperations<T extends FeathersAdapter<Person>>(
  service: T,
  idProp: string,
  _config: TestConfig = FEATHERS_CONFIG
) {
  describe('FeathersJS Bulk Operations', () => {
    beforeEach(async () => {
      const data = [
        { name: 'Alice', age: 25, created: true },
        { name: 'Bob', age: 30, created: true },
        { name: 'Charlie', age: 35, created: false }
      ]
      await service.create(data)
    })

    afterEach(async () => {
      // Clean up remaining items
      try {
        const remaining = await service.find({ paginate: false })
        const items = Array.isArray(remaining) ? remaining : remaining.data
        for (const item of items) {
          try {
            await service.remove(item[idProp])
          } catch (error) {
            // Ignore cleanup errors
          }
        }
      } catch (error) {
        // Ignore cleanup errors
      }
    })

    it('patch(null, data, params) should update multiple records', async () => {
      const result = await service.patch(null, { age: 99 }, { query: { created: true } })

      assert.ok(Array.isArray(result), 'Should return array of updated items')
      assert.strictEqual(result.length, 2, 'Should update 2 items')
      result.forEach((item) => {
        assert.strictEqual(item.age, 99, 'All items should have updated age')
      })
    })

    it('remove(null, params) should remove multiple records', async () => {
      const result = await service.remove(null, { query: { created: true } })

      assert.ok(Array.isArray(result), 'Should return array of removed items')
      assert.strictEqual(result.length, 2, 'Should remove 2 items')

      // Verify items were removed
      const remaining = await service.find({ paginate: false })
      const remainingData = Array.isArray(remaining) ? remaining : remaining.data
      assert.strictEqual(remainingData.length, 1, 'Should have 1 remaining item')
      assert.strictEqual(remainingData[0].name, 'Charlie')
    })

    it('patch(null, data) without query should update all records', async () => {
      const result = await service.patch(null, { age: 100 })

      assert.ok(Array.isArray(result), 'Should return array of updated items')
      assert.strictEqual(result.length, 3, 'Should update all 3 items')
      result.forEach((item) => {
        assert.strictEqual(item.age, 100, 'All items should have updated age')
      })
    })

    it('remove(null) without query should remove all records', async () => {
      const result = await service.remove(null)

      assert.ok(Array.isArray(result), 'Should return array of removed items')
      assert.strictEqual(result.length, 3, 'Should remove all 3 items')

      // Verify all items were removed
      const remaining = await service.find({ paginate: false })
      const remainingData = Array.isArray(remaining) ? remaining : remaining.data
      assert.strictEqual(remainingData.length, 0, 'Should have no remaining items')
    })

    it('patch(null, data) with complex queries should work', async () => {
      const result = await service.patch(null, { age: 77 }, { query: { name: { $in: ['Alice', 'Bob'] } } })

      assert.ok(Array.isArray(result), 'Should return array of updated items')
      assert.strictEqual(result.length, 2, 'Should update items matching $in query')
      result.forEach((item) => {
        assert.strictEqual(item.age, 77, 'All items should have updated age')
        assert.ok(['Alice', 'Bob'].includes(item.name), 'Should only update Alice and Bob')
      })
    })

    it('patch(null, data) with $gte query should work', async () => {
      const result = await service.patch(null, { age: 88 }, { query: { age: { $gte: 25 } } })

      assert.ok(Array.isArray(result), 'Should return array of updated items')
      assert.ok(result.length >= 3, 'Should update items with age >= 25')
      result.forEach((item) => {
        assert.strictEqual(item.age, 88, 'All items should have updated age')
      })
    })

    it('remove(null, params) with $gte query should work', async () => {
      const result = await service.remove(null, { query: { age: { $gte: 25 } } })

      assert.ok(Array.isArray(result), 'Should return array of removed items')
      assert.ok(result.length >= 3, 'Should remove items with age >= 25')

      // Verify items were removed
      const remaining = await service.find({ paginate: false })
      const remainingData = Array.isArray(remaining) ? remaining : remaining.data
      assert.strictEqual(remainingData.length, 0, 'Should have no remaining items')
    })

    it('patch(null, data) should handle paginate: false', async () => {
      const params = { query: { age: { $gte: 25 } }, paginate: false }
      const result = await service.patch(null, { age: 66 }, params)

      assert.ok(Array.isArray(result), 'Should return array of updated items')
      assert.ok(result.length >= 3, 'Should update multiple items')
      result.forEach((item) => {
        assert.strictEqual(item.age, 66, 'All items should have updated age')
      })
    })

    it('remove(null, params) should handle paginate: false', async () => {
      const params = { query: { age: { $gte: 25 } }, paginate: false }
      const result = await service.remove(null, params)

      assert.ok(Array.isArray(result), 'Should return array of removed items')
      assert.ok(result.length >= 3, 'Should remove multiple items')

      // Verify items were removed
      const remaining = await service.find({ paginate: false })
      const remainingData = Array.isArray(remaining) ? remaining : remaining.data
      assert.strictEqual(remainingData.length, 0, 'Should have no remaining items')
    })
  })
}
