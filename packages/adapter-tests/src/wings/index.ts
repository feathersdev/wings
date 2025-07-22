import { describe } from 'vitest'
import { WingsAdapter, Person, TestConfig, WINGS_CONFIG, ServiceFactory } from '../types.js'

// Export individual test functions
export { testWingsPagination } from './pagination.js'
export { testWingsNullReturns } from './null-returns.js'
export { testWingsBulkOperations } from './bulk-operations.js'
export { testWingsQueryOperators } from './query-operators.js'
export { testWingsSingleOperationSafety } from './single-operation-safety.js'

// Import for the test suite composer
import { testWingsPagination } from './pagination.js'
import { testWingsNullReturns } from './null-returns.js'
import { testWingsBulkOperations } from './bulk-operations.js'
import { testWingsQueryOperators } from './query-operators.js'
import { testWingsSingleOperationSafety } from './single-operation-safety.js'

// Test suite composer for Wings functionality
export function wingsTests<T extends WingsAdapter<Person>>(
  serviceFactory: ServiceFactory<T>,
  idProp: string,
  config: TestConfig = WINGS_CONFIG
) {
  describe('Wings Tests', () => {
    testWingsPagination(serviceFactory, idProp, config)
    testWingsNullReturns(serviceFactory, idProp, config)
    testWingsBulkOperations(serviceFactory, idProp, config)
    testWingsQueryOperators(serviceFactory, idProp, config)
    testWingsSingleOperationSafety(serviceFactory, idProp, config)
  })
}
