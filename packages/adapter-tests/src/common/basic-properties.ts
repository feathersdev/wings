import { describe, it, beforeEach, expect } from 'vitest'
import { BaseAdapter, Person, ServiceFactory } from '../types.js'

export function testBasicProperties<T extends BaseAdapter<Person>>(
  serviceFactory: ServiceFactory<T>,
  idProp: string
) {
  describe('Basic Properties', () => {
    let service: T

    beforeEach(() => {
      service = serviceFactory()
    })

    it('should have id property', () => {
      expect((service as any).id).toBe(idProp)
    })

    it('should have options property', () => {
      expect((service as any).options).toBeDefined()
    })
  })
}
