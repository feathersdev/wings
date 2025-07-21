import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'assert'
import { WingsAdapter, Person, TestConfig, WINGS_CONFIG } from '../types.js'

export function testWingsBulkOperations<T extends WingsAdapter<Person>>(
  service: T,
  idProp: string,
  _config: TestConfig = WINGS_CONFIG
) {
  describe('Wings Bulk Operations', () => {
    let testData: Person[] = []

    beforeEach(async () => {
      const data = [
        { name: 'Alice', age: 25, created: true },
        { name: 'Bob', age: 30, created: true },
        { name: 'Charlie', age: 35, created: false }
      ]
      const result = await service.create(data)
      testData = Array.isArray(result) ? result : [result]
    })

    afterEach(async () => {
      try {
        await service.removeAll()
      } catch (error) {
        // Try individual cleanup
        for (const item of testData) {
          try {
            await service.remove(item[idProp])
          } catch (e) {
            // Ignore individual cleanup errors
          }
        }
      }
      testData = []
    })

    it('patchMany() should update multiple records with query', async () => {
      const result = await service.patchMany({ age: 99 }, { query: { created: true } })

      assert.ok(Array.isArray(result), 'Should return array of updated items')
      assert.strictEqual(result.length, 2, 'Should update 2 items')
      result.forEach((item) => {
        assert.strictEqual(item.age, 99, 'All items should have updated age')
      })
    })

    it('patchMany() should require query or allowAll flag', async () => {
      await assert.rejects(
        async () => {
          await service.patchMany({ age: 100 }, {})
        },
        /No query provided.*allowAll/,
        'Should throw error without query or allowAll'
      )
    })

    it('patchMany() should update all records with allowAll: true', async () => {
      const result = await service.patchMany({ age: 100 }, { allowAll: true })

      assert.ok(Array.isArray(result), 'Should return array of updated items')
      assert.strictEqual(result.length, 3, 'Should update all 3 items')
      result.forEach((item) => {
        assert.strictEqual(item.age, 100, 'All items should have updated age')
      })
    })

    it('removeMany() should remove multiple records with query', async () => {
      const result = await service.removeMany({ query: { created: true } })

      assert.ok(Array.isArray(result), 'Should return array of removed items')
      assert.strictEqual(result.length, 2, 'Should remove 2 items')

      // Verify items were removed
      const remaining = await service.find()
      const remainingData = Array.isArray(remaining) ? remaining : remaining.data
      assert.strictEqual(remainingData.length, 1, 'Should have 1 remaining item')
      assert.strictEqual(remainingData[0].name, 'Charlie')
    })

    it('removeMany() should require query or allowAll flag', async () => {
      await assert.rejects(
        async () => {
          await service.removeMany({})
        },
        /No query provided.*allowAll/,
        'Should throw error without query or allowAll'
      )
    })

    it('removeAll() should remove all records', async () => {
      const result = await service.removeAll()

      assert.ok(Array.isArray(result), 'Should return array (may be empty)')

      // Verify all items were removed
      const remaining = await service.find()
      const remainingData = Array.isArray(remaining) ? remaining : remaining.data
      assert.strictEqual(remainingData.length, 0, 'Should have no remaining items')
    })
  })
}
