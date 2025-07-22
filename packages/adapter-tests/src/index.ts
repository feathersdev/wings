// Type definitions and configurations
export * from './types.js'

// Common tests that work for both interfaces
export * from './common/index.js'

// Wings-specific tests
export * from './wings/index.js'

// FeathersJS-specific tests
export * from './feathersjs/index.js'

// Re-export individual test functions for fine-grained control
export {
  // Common tests
  testBasicProperties,
  testCreate,
  testGet,
  testBasicFind,
  testPatch,
  testUpdate,
  testRemove,
  testBasicQueryOperators,
  commonTests
} from './common/index.js'

export {
  // Wings tests
  testWingsPagination,
  testWingsNullReturns,
  testWingsBulkOperations,
  testWingsQueryOperators,
  testWingsSingleOperationSafety,
  wingsTests
} from './wings/index.js'

export {
  // FeathersJS tests
  testFeathersErrorHandling,
  testFeathersPagination,
  testFeathersBulkOperations,
  testFeathersUpdate,
  feathersTests
} from './feathersjs/index.js'

// Full test suite composers for easy usage
import { describe } from 'vitest'
import {
  WingsAdapter,
  FeathersAdapter,
  Person,
  TestConfig,
  WINGS_CONFIG,
  FEATHERS_CONFIG,
  ServiceFactory
} from './types.js'
import { commonTests } from './common/index.js'
import { wingsTests } from './wings/index.js'
import { feathersTests } from './feathersjs/index.js'

/**
 * Complete test suite for Wings adapters
 * Includes common tests + Wings-specific tests
 */
export function fullWingsTests<T extends WingsAdapter<Person>>(
  serviceFactory: ServiceFactory<T>,
  idProp: string,
  config: TestConfig = WINGS_CONFIG
) {
  describe('Full Wings Adapter Test Suite', () => {
    commonTests(serviceFactory, idProp, config)
    wingsTests(serviceFactory, idProp, config)
  })
}

/**
 * Complete test suite for FeathersJS adapters
 * Includes common tests + FeathersJS-specific tests
 */
export function fullFeathersTests<T extends FeathersAdapter<Person>>(
  serviceFactory: ServiceFactory<T>,
  idProp: string,
  config: TestConfig = FEATHERS_CONFIG
) {
  describe('Full FeathersJS Adapter Test Suite', () => {
    commonTests(serviceFactory, idProp, { ...config, alwaysPaginate: true })
    feathersTests(serviceFactory, idProp, config)
  })
}

/**
 * Complete test suite for testing both Wings and FeathersJS compatibility
 * Use this for testing wrapper implementations
 */
export function fullCompatibilityTests<T extends WingsAdapter<Person> & FeathersAdapter<Person>>(
  serviceFactory: ServiceFactory<T>,
  idProp: string,
  wingsConfig: TestConfig = WINGS_CONFIG,
  feathersConfig: TestConfig = FEATHERS_CONFIG
) {
  describe('Full Compatibility Test Suite', () => {
    commonTests(serviceFactory, idProp, wingsConfig)
    wingsTests(serviceFactory, idProp, wingsConfig)
    feathersTests(serviceFactory, idProp, feathersConfig)
  })
}

// Legacy compatibility - export the old interface for existing adapters
export const adapterTests = fullFeathersTests
