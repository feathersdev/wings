import { describe } from 'node:test'
import { WingsAdapter, Person, TestConfig, WINGS_CONFIG } from '../types.js'

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
  service: T,
  idProp: string,
  config: TestConfig = WINGS_CONFIG
) {
  describe('Wings Tests', () => {
    testWingsPagination(service, idProp, config)
    testWingsNullReturns(service, idProp, config)
    testWingsBulkOperations(service, idProp, config)
    testWingsQueryOperators(service, idProp, config)
    testWingsSingleOperationSafety(service, idProp, config)
  })
}
