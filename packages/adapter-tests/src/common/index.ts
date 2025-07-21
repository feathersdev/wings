import { describe } from 'node:test'
import { BaseAdapter, Person, TestConfig, COMMON_CONFIG } from '../types.js'

// Export individual test functions
export { testBasicProperties } from './basic-properties.js'
export { testCreate } from './create.js'
export { testGet } from './get.js'
export { testBasicFind } from './basic-find.js'
export { testPatch } from './patch.js'
export { testUpdate } from './update.js'
export { testRemove } from './remove.js'
export { testBasicQueryOperators } from './basic-query-operators.js'

// Import for the test suite composer
import { testBasicProperties } from './basic-properties.js'
import { testCreate } from './create.js'
import { testGet } from './get.js'
import { testBasicFind } from './basic-find.js'
import { testPatch } from './patch.js'
import { testUpdate } from './update.js'
import { testRemove } from './remove.js'
import { testBasicQueryOperators } from './basic-query-operators.js'

// Test suite composer for common functionality
export function commonTests<T extends BaseAdapter<Person>>(
  service: T,
  idProp: string,
  config: TestConfig = COMMON_CONFIG
) {
  describe('Common Tests', () => {
    testBasicProperties(service, idProp)
    testCreate(service, idProp, config)
    testGet(service, idProp, config)
    testBasicFind(service, idProp, config)
    testPatch(service, idProp, config)
    testUpdate(service, idProp, config)
    testRemove(service, idProp, config)
    testBasicQueryOperators(service, idProp, config)
  })
}
