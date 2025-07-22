import { describe } from 'vitest'
import { FeathersAdapter, Person, TestConfig, FEATHERS_CONFIG, ServiceFactory } from '../types.js'

// Export individual test functions
export { testFeathersErrorHandling } from './error-handling.js'
export { testFeathersPagination } from './pagination.js'
export { testFeathersBulkOperations } from './bulk-operations.js'
export { testFeathersUpdate } from './update.js'

// Import for the test suite composer
import { testFeathersErrorHandling } from './error-handling.js'
import { testFeathersPagination } from './pagination.js'
import { testFeathersBulkOperations } from './bulk-operations.js'
import { testFeathersUpdate } from './update.js'

// Test suite composer for FeathersJS functionality
export function feathersTests<T extends FeathersAdapter<Person>>(
  serviceFactory: ServiceFactory<T>,
  idProp: string,
  config: TestConfig = FEATHERS_CONFIG
) {
  describe('FeathersJS Tests', () => {
    testFeathersErrorHandling(serviceFactory, idProp, config)
    testFeathersPagination(serviceFactory, idProp, config)
    testFeathersBulkOperations(serviceFactory, idProp, config)
    testFeathersUpdate(serviceFactory, idProp, config)
  })
}
