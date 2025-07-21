import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'assert'
import { FeathersAdapter, Person, TestConfig, FEATHERS_CONFIG } from '../types.js'

export function testFeathersUpdate<T extends FeathersAdapter<Person>>(
  service: T,
  idProp: string,
  _config: TestConfig = FEATHERS_CONFIG
) {
  describe('FeathersJS Update Method', () => {
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

    it('update() should replace entire record', async () => {
      const updateData = { name: 'Updated User', age: 99 }
      const result = await service.update(testItem[idProp], updateData)

      assert.ok(result, 'Should return updated item')
      assert.strictEqual(result.name, 'Updated User')
      assert.strictEqual(result.age, 99)

      // Verify the record was actually updated
      const retrieved = await service.get(testItem[idProp])
      assert.strictEqual(retrieved.name, 'Updated User')
      assert.strictEqual(retrieved.age, 99)
    })

    it('update() with $select should return only selected fields', async () => {
      const updateData = { name: 'Selected User', age: 88 }
      const result = await service.update(testItem[idProp], updateData, { query: { $select: ['name'] } })

      assert.ok(result, 'Should return updated item')
      assert.strictEqual(result.name, 'Selected User')
      assert.ok(result[idProp], 'Should always include id field')
      assert.strictEqual(result.age, undefined, 'Should not include unselected fields')
    })
  })
}
