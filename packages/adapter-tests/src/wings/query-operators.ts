import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'assert'
import { WingsAdapter, Person, TestConfig, WINGS_CONFIG } from '../types.js'

export function testWingsQueryOperators<T extends WingsAdapter<Person>>(
  service: T,
  idProp: string,
  _config: TestConfig = WINGS_CONFIG
) {
  describe('Wings Query Operators', () => {
    let testData: Person[] = []

    beforeEach(async () => {
      const data = [
        { name: 'Alice', age: 25 },
        { name: 'Bob', age: null },
        { name: 'alice', age: 30 },
        { name: 'ALICE', age: 35 }
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

    if (WINGS_CONFIG.supportsLike) {
      it('should support $like operator', async () => {
        const result = await service.find({ query: { name: { $like: 'A%' } } })
        const data = Array.isArray(result) ? result : result.data

        assert.ok(Array.isArray(data))
        assert.ok(data.length >= 2, 'Should find Alice and ALICE')
        const names = data.map((item) => item.name)
        assert.ok(names.includes('Alice'))
        assert.ok(names.includes('ALICE'))
      })
    }

    if (WINGS_CONFIG.supportsIlike) {
      it('should support $ilike operator (case insensitive)', async () => {
        const result = await service.find({ query: { name: { $ilike: 'alice' } } })
        const data = Array.isArray(result) ? result : result.data

        assert.ok(Array.isArray(data))
        assert.strictEqual(data.length, 3, 'Should find all variations of Alice')
        const names = data.map((item) => item.name).sort()
        assert.deepStrictEqual(names, ['ALICE', 'Alice', 'alice'])
      })
    }

    if (WINGS_CONFIG.supportsIsNull) {
      it('should support $isNull operator', async () => {
        // Test $isNull: true
        const nullResult = await service.find({ query: { age: { $isNull: true } } })
        const nullData = Array.isArray(nullResult) ? nullResult : nullResult.data

        assert.ok(Array.isArray(nullData))
        assert.strictEqual(nullData.length, 1, 'Should find 1 item with null age')
        assert.strictEqual(nullData[0].name, 'Bob')

        // Test $isNull: false
        const notNullResult = await service.find({ query: { age: { $isNull: false } } })
        const notNullData = Array.isArray(notNullResult) ? notNullResult : notNullResult.data

        assert.ok(Array.isArray(notNullData))
        assert.strictEqual(notNullData.length, 3, 'Should find 3 items with non-null age')
      })
    }
  })
}
