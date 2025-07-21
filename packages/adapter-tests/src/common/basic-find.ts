import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'assert'
import { BaseAdapter, Person, TestConfig, COMMON_CONFIG } from '../types.js'

export function testBasicFind<T extends BaseAdapter<Person>>(
  service: T,
  idProp: string,
  config: TestConfig = COMMON_CONFIG
) {
  describe('Basic Find', () => {
    let testData: Person[] = []

    beforeEach(async () => {
      // Create test data
      const data = [
        { name: 'Alice', age: 25 },
        { name: 'Bob', age: 30 },
        { name: 'Charlie', age: 35 }
      ]
      const result = await service.create(data)
      testData = Array.isArray(result) ? result : [result]
    })

    afterEach(async () => {
      // Clean up test data
      for (const item of testData) {
        try {
          await service.remove(item[idProp])
        } catch (error) {
          // Ignore cleanup errors
        }
      }
      testData = []
    })

    it('should find all items', async () => {
      const result = await service.find()
      const data = config.alwaysPaginate ? (result as any).data : result

      assert.ok(Array.isArray(data), 'Should return array or paginated data')
      assert.ok(data.length >= 3, 'Should return at least 3 items')
    })

    it('should find items with query', async () => {
      const result = await service.find({ query: { name: 'Alice' } })
      const data = config.alwaysPaginate ? (result as any).data : result

      assert.ok(Array.isArray(data), 'Should return array or paginated data')
      assert.strictEqual(data.length, 1, 'Should return 1 item')
      assert.strictEqual(data[0].name, 'Alice')
    })

    it('should support $limit', async () => {
      const result = await service.find({ query: { $limit: 2 } })
      const data = config.alwaysPaginate ? (result as any).data : result

      assert.ok(Array.isArray(data), 'Should return array or paginated data')
      assert.strictEqual(data.length, 2, 'Should return 2 items')
    })

    it('should support $skip', async () => {
      const result = await service.find({ query: { $skip: 1, $sort: { name: 1 } } })
      const data = config.alwaysPaginate ? (result as any).data : result

      assert.ok(Array.isArray(data), 'Should return array or paginated data')
      assert.ok(data.length >= 2, 'Should return at least 2 items (skipping 1)')
      assert.notStrictEqual(data[0].name, 'Alice', 'Should skip first item when sorted by name')
    })

    it('should support $sort ascending', async () => {
      const result = await service.find({ query: { $sort: { name: 1 } } })
      const data = config.alwaysPaginate ? (result as any).data : result

      assert.ok(Array.isArray(data), 'Should return array or paginated data')
      assert.ok(data.length >= 3, 'Should return at least 3 items')
      assert.strictEqual(data[0].name, 'Alice')
      assert.strictEqual(data[1].name, 'Bob')
      assert.strictEqual(data[2].name, 'Charlie')
    })

    it('should support $sort descending', async () => {
      const result = await service.find({ query: { $sort: { name: -1 } } })
      const data = config.alwaysPaginate ? (result as any).data : result

      assert.ok(Array.isArray(data), 'Should return array or paginated data')
      assert.ok(data.length >= 3, 'Should return at least 3 items')
      assert.strictEqual(data[0].name, 'Charlie')
      assert.strictEqual(data[1].name, 'Bob')
      assert.strictEqual(data[2].name, 'Alice')
    })

    it('should support $select', async () => {
      const result = await service.find({ query: { name: 'Alice', $select: ['name'] } })
      const data = config.alwaysPaginate ? (result as any).data : result

      assert.ok(Array.isArray(data), 'Should return array or paginated data')
      assert.strictEqual(data.length, 1, 'Should return 1 item')
      assert.strictEqual(data[0].name, 'Alice')
      assert.ok(data[0][idProp], 'Should always include id field')
      assert.strictEqual(data[0].age, undefined, 'Should not include unselected fields')
    })
  })
}
