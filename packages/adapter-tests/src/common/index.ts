import { describe } from 'vitest'
import { BaseAdapter, Person, TestConfig, COMMON_CONFIG, ServiceFactory } from '../types.js'

// Export individual test functions
export { testBasicProperties } from './basic-properties.js'
export { testCreate } from './create.js'
export { testGet } from './get.js'
export { testBasicFind } from './basic-find.js'
export { testPatch } from './patch.js'
export { testUpdate } from './update.js'
export { testRemove } from './remove.js'
export { testBasicQueryOperators } from './basic-query-operators.js'
export { testErrorHandling } from './error-handling.js'
export { testAdvancedQueryOperators } from './advanced-query-operators.js'

// Import for the test suite composer
import { testBasicProperties } from './basic-properties.js'
import { testCreate } from './create.js'
import { testGet } from './get.js'
import { testBasicFind } from './basic-find.js'
import { testPatch } from './patch.js'
import { testUpdate } from './update.js'
import { testRemove } from './remove.js'
import { testBasicQueryOperators } from './basic-query-operators.js'
import { testErrorHandling } from './error-handling.js'
import { testAdvancedQueryOperators } from './advanced-query-operators.js'

// Test suite composer for common functionality
export function commonTests<T extends BaseAdapter<Person>>(
  serviceFactory: ServiceFactory<T>,
  idProp: string,
  config: TestConfig = COMMON_CONFIG,
  errorHandler?: (error: any) => void
) {
  describe('Common Tests', () => {
    testBasicProperties(serviceFactory, idProp)
    testCreate(serviceFactory, idProp, config)
    testGet(serviceFactory, idProp, config)
    testBasicFind(serviceFactory, idProp, config)
    testPatch(serviceFactory, idProp, config)
    testUpdate(serviceFactory, idProp, config)
    testRemove(serviceFactory, idProp, config)
    testBasicQueryOperators(serviceFactory, idProp, config)
    testErrorHandling(serviceFactory, idProp, config, errorHandler)
    testAdvancedQueryOperators(serviceFactory, idProp, config)
  })
}
