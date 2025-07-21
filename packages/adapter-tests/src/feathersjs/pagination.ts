import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'assert'
import { FeathersAdapter, Person, TestConfig, FEATHERS_CONFIG } from '../types.js'

export function testFeathersPagination<T extends FeathersAdapter<Person>>(
  service: T,
  idProp: string,
  _config: TestConfig = FEATHERS_CONFIG
) {
  describe('FeathersJS Pagination', () => {
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

    it('should return Paginated object by default', async () => {
      const result = await service.find()

      assert.ok(result && typeof result === 'object', 'Should return object')
      assert.ok(!Array.isArray(result), 'Should not be an array')
      assert.ok(typeof result.total === 'number', 'Should have total count')
      assert.ok(typeof result.limit === 'number', 'Should have limit')
      assert.ok(typeof result.skip === 'number', 'Should have skip')
      assert.ok(Array.isArray(result.data), 'Should have data array')
      assert.ok(result.data.length >= 3, 'Should have test data')
    })

    it('should return array when paginate: false', async () => {
      const result = await service.find({ paginate: false })

      assert.ok(Array.isArray(result), 'Should return array when paginate: false')
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
        query: { $limit: 2, $skip: 1, $sort: { name: 1 } }
      })

      assert.strictEqual(result.total, 3, 'Total should be 3')
      assert.strictEqual(result.limit, 2, 'Limit should be 2')
      assert.strictEqual(result.skip, 1, 'Skip should be 1')
      assert.strictEqual(result.data.length, 2, 'Should return 2 items')
      assert.strictEqual(result.data[0].name, 'Bob', 'Should skip Alice and start with Bob')
    })
  })
}
