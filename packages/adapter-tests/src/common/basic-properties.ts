import { describe, it } from 'node:test'
import assert from 'assert'
import { BaseAdapter, Person } from '../types.js'

export function testBasicProperties<T extends BaseAdapter<Person>>(service: T, idProp: string) {
  describe('Basic Properties', () => {
    it('should have id property', () => {
      assert.strictEqual((service as any).id, idProp, 'id property is set to expected name')
    })

    it('should have options property', () => {
      assert.ok((service as any).options, 'Options are available in service.options')
    })
  })
}
