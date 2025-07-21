import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'assert'
import { FeathersAdapter, Person, TestConfig, FEATHERS_CONFIG } from '../types.js'

export function testFeathersErrorHandling<T extends FeathersAdapter<Person>>(
  service: T,
  idProp: string,
  _config: TestConfig = FEATHERS_CONFIG
) {
  describe('FeathersJS Error Handling', () => {
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

    it('get() should throw NotFound for non-existent item', async () => {
      await assert.rejects(
        async () => {
          await service.get('non-existent-id')
        },
        {
          name: 'NotFound'
        },
        'Should throw NotFound error for non-existent item'
      )
    })

    it('patch() should throw NotFound for non-existent item', async () => {
      await assert.rejects(
        async () => {
          await service.patch('non-existent-id', { name: 'Updated' })
        },
        {
          name: 'NotFound'
        },
        'Should throw NotFound error for non-existent item'
      )
    })

    it('remove() should throw NotFound for non-existent item', async () => {
      await assert.rejects(
        async () => {
          await service.remove('non-existent-id')
        },
        {
          name: 'NotFound'
        },
        'Should throw NotFound error for non-existent item'
      )
    })

    it('get() should return item when found', async () => {
      const result = await service.get(testItem[idProp])
      assert.ok(result, 'Should return item when found')
      assert.strictEqual((result as Person).name, 'Test User')
    })

    it('patch() should return updated item when found', async () => {
      const result = await service.patch(testItem[idProp], { name: 'Updated User' })
      assert.ok(result, 'Should return updated item')
      assert.strictEqual((result as Person).name, 'Updated User')
    })

    it('remove() should return removed item when found', async () => {
      const result = await service.remove(testItem[idProp])
      assert.ok(result, 'Should return removed item')
      assert.strictEqual((result as Person).name, 'Test User')

      // Verify item was actually removed by checking it throws NotFound
      await assert.rejects(
        async () => {
          await service.get(testItem[idProp])
        },
        { name: 'NotFound' },
        'Item should be removed'
      )
    })
  })
}
