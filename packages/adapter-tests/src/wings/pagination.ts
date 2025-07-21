import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'assert'
import { WingsAdapter, Person, TestConfig, WINGS_CONFIG } from '../types.js'

export function testWingsPagination<T extends WingsAdapter<Person>>(
  service: T,
  idProp: string,
  _config: TestConfig = WINGS_CONFIG
) {
  describe('Wings Pagination', () => {
    let testData: Person[] = []

    beforeEach(async () => {
      const data = [
        { name: 'Alice', age: 25 },
        { name: 'Bob', age: 30 },
        { name: 'Charlie', age: 35 }
      ]
      const result = await service.create(data)
      testData = Array.isArray(result) ? result : [result]
    })

    afterEach(async () => {
      for (const item of testData) {
        try {
          await service.remove(item[idProp])
        } catch (error) {
          // Ignore cleanup errors
        }
      }
      testData = []
    })

    it('should return array by default (no paginate param)', async () => {
      const result = await service.find()

      assert.ok(Array.isArray(result), 'Should return array directly')
      assert.ok(result.length >= 3, 'Should have test data')
      assert.strictEqual(typeof result[0], 'object', 'Array should contain objects')
    })

    it('should return array when paginate: false', async () => {
      const result = await service.find({ paginate: false })

      assert.ok(Array.isArray(result), 'Should return array directly')
      assert.ok(result.length >= 3, 'Should have test data')
    })

    it('should return Paginated object when paginate: true', async () => {
      const result = await service.find({ paginate: true, query: { $sort: { name: 1 } } })

      assert.ok(result && typeof result === 'object', 'Should return object')
      assert.ok(!Array.isArray(result), 'Should not be an array')
      assert.ok(typeof result.total === 'number', 'Should have total count')
      assert.ok(typeof result.limit === 'number', 'Should have limit')
      assert.ok(typeof result.skip === 'number', 'Should have skip')
      assert.ok(Array.isArray(result.data), 'Should have data array')
      assert.ok(result.data.length >= 3, 'Should have test data')
    })

    it('should paginate with $limit and $skip', async () => {
      const result = await service.find({
        paginate: true,
        query: { $limit: 2, $skip: 1, $sort: { name: 1 } }
      })

      assert.strictEqual(result.total, 3, 'Total should be 3')
      assert.strictEqual(result.limit, 2, 'Limit should be 2')
      assert.strictEqual(result.skip, 1, 'Skip should be 1')
      assert.strictEqual(result.data.length, 2, 'Should return 2 items')
      assert.strictEqual(result.data[0].name, 'Bob', 'Should skip Alice and start with Bob')
    })

    it('should respect query filters in pagination total count', async () => {
      const result = await service.find({
        paginate: true,
        query: { age: { $gte: 30 } }
      })

      assert.strictEqual(result.total, 2, 'Total should only count matching records')
      assert.strictEqual(result.data.length, 2, 'Should return matching records')
    })
  })
}
