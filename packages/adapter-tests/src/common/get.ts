import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'assert'
import { BaseAdapter, Person, TestConfig, COMMON_CONFIG } from '../types.js'

export function testGet<T extends BaseAdapter<Person>>(
  service: T,
  idProp: string,
  config: TestConfig = COMMON_CONFIG
) {
  describe('Get', () => {
    let doug: Person

    beforeEach(async () => {
      const result = await service.create({
        name: 'Doug',
        age: 32
      })
      doug = Array.isArray(result) ? result[0] : result
    })

    afterEach(async () => {
      try {
        await service.remove(doug[idProp])
      } catch (error: any) {}
    })

    it('should get a record by id', async () => {
      const data = await service.get(doug[idProp])
      assert.strictEqual(data?.[idProp].toString(), doug[idProp].toString(), `${idProp} id matches`)
      assert.strictEqual(data?.name, 'Doug', 'data.name matches')
      assert.strictEqual(data?.age, 32, 'data.age matches')
    })

    it('should support $select', async () => {
      const data = await service.get(doug[idProp], {
        query: { $select: ['name'] }
      })
      assert.strictEqual(data?.[idProp].toString(), doug[idProp].toString(), `${idProp} id property matches`)
      assert.strictEqual(data?.name, 'Doug', 'data.name matches')
      assert.ok(!data?.age, 'data.age is falsy')
    })

    it('should get with id and query', async () => {
      const result = await service.get(doug[idProp], {
        query: { name: 'Doug' }
      })
      assert.ok(result, 'Should return result when query matches')
      assert.strictEqual(result.name, 'Doug')
    })

    it('should return appropriate result when not found', async () => {
      const result = await service.get('568225fbfe21222432e836ff')

      if (config.throwOnNotFound) {
        // This test should be handled by the error handling tests
        // but we include it here for completeness
        assert.strictEqual(result, null, 'Should return null when not found')
      } else {
        assert.strictEqual(result, null, 'Should return null when not found')
      }
    })

    it('should handle id + query mismatch', async () => {
      const aliceResult = await service.create({
        name: 'Alice',
        age: 12
      })
      const alice = Array.isArray(aliceResult) ? aliceResult[0] : aliceResult

      const query = { [idProp]: alice[idProp] }
      // querying by doug's id with alice's id in query should return null
      const result = await service.get(doug[idProp], { query })

      if (config.throwOnNotFound) {
        assert.strictEqual(result, null, 'Should return null for mismatched query')
      } else {
        assert.strictEqual(result, null, 'Should return null for mismatched query')
      }

      await service.remove(alice[idProp])
    })
  })
}
