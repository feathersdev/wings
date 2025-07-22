# Wings Adapter Tests

> Universal test suite for Wings database adapters and FeathersJS compatibility wrappers

## About

This package provides a comprehensive test suite for validating Wings database adapters and their FeathersJS compatibility wrappers. It supports three types of testing:

- **Common Tests**: Core functionality that works identically across both Wings and FeathersJS interfaces
- **Wings Tests**: Features specific to the Wings interface (smart pagination, null returns, explicit bulk operations)
- **FeathersJS Tests**: Legacy FeathersJS interface compatibility (error throwing, always paginated results, implicit bulk operations)

## Quick Start

### Testing a Wings Adapter

```typescript
import { commonTests, wingsTests, WINGS_CONFIG } from '@wingshq/adapter-tests'
import { createMyAdapter } from './my-adapter'

// Service factory function for test isolation
const createService = () => {
  // Return a fresh adapter instance for each test
  return createMyAdapter({ /* config */ })
}

// Run comprehensive test suite
describe('My Wings Adapter', () => {
  commonTests(createService, 'id', WINGS_CONFIG)
  wingsTests(createService, 'id')
})
```

### Testing a FeathersJS Wrapper

```typescript
import { commonTests, feathersTests, FEATHERS_CONFIG } from '@wingshq/adapter-tests'
import { FeathersMyAdapter } from './feathers-wrapper'

const createService = () => {
  return new FeathersMyAdapter({ /* config */ })
}

describe('My FeathersJS Wrapper', () => {
  commonTests(createService, 'id', FEATHERS_CONFIG)
  feathersTests(createService, 'id')
})
```

## Development Guide

### Creating a Wings Adapter

Follow these steps to create a fully-tested Wings adapter:

#### Step 1: Implement the Wings Interface

Create your adapter by extending `AdapterBase` and implementing the Wings interface:

```typescript
import { AdapterBase, AdapterInterface } from '@wingshq/adapter-commons'

export class MyWingsAdapter<T extends Record<string, any>> 
  extends AdapterBase<T> 
  implements AdapterInterface<T> {
  
  constructor(options: MyAdapterOptions) {
    super(options)
  }

  async find(params?: AdapterParams): Promise<T[] | Paginated<T>> {
    // Return T[] by default, Paginated<T> when params.paginate = true
  }

  async get(id: Primitive, params?: AdapterParams): Promise<T | null> {
    // Return null instead of throwing when not found
  }

  async create(data: Partial<T> | Partial<T>[], params?: AdapterParams): Promise<T | T[]> {
    // Create one or more records
  }

  async patch(id: Primitive, data: Partial<T>, params?: AdapterParams): Promise<T | null> {
    // Patch single record, return null if not found
  }

  async patchMany(data: Partial<T>, params: AdapterParams & { allowAll?: boolean }): Promise<T[]> {
    // Bulk patch with safety controls
    if (!params.query && !params.allowAll) {
      throw new BadRequest('No query provided. Use allowAll: true to update all records')
    }
  }

  async remove(id: Primitive, params?: AdapterParams): Promise<T | null> {
    // Remove single record, return null if not found
  }

  async removeMany(params: AdapterParams & { allowAll?: boolean }): Promise<T[]> {
    // Bulk remove with safety controls
    if (!params.query && !params.allowAll) {
      throw new BadRequest('No query provided. Use allowAll: true to remove all records')
    }
  }

  async removeAll(params?: AdapterParams): Promise<T[]> {
    // Clear entire table
  }
}
```

#### Step 2: Create Test File

Create a test file using the service factory pattern:

```typescript
// test/wings.test.ts
import { describe } from 'vitest'
import { commonTests, wingsTests, WINGS_CONFIG } from '@wingshq/adapter-tests'
import { MyWingsAdapter } from '../src/index.js'

const createService = () => {
  // Return fresh adapter instance for each test
  return new MyWingsAdapter({
    // Configuration for test database/storage
  })
}

describe('MyWingsAdapter', () => {
  commonTests(createService, 'id', WINGS_CONFIG)
  wingsTests(createService, 'id')
})
```

#### Step 3: Configure Test Runner

Add vitest configuration to your `package.json`:

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run"
  },
  "devDependencies": {
    "vitest": "^1.6.1",
    "@wingshq/adapter-tests": "^0.0.0"
  }
}
```

#### Step 4: Implement Query Operators

Wings adapters should support these query operators where applicable:

```typescript
// Standard operators (all adapters)
{ $limit: 10, $skip: 0, $sort: { name: 1 } }
{ age: { $gt: 18, $lte: 65, $in: [25, 30, 35] } }

// Database-specific operators (implement as supported)
{ name: { $like: 'John%' } }        // SQL LIKE
{ name: { $ilike: 'john' } }        // Case-insensitive LIKE  
{ age: { $isNull: true } }          // NULL checks
```

### Creating a FeathersJS Wrapper

Once you have a working Wings adapter, create a FeathersJS compatibility wrapper:

#### Step 1: Implement the Wrapper

```typescript
// src/feathers.ts
import { FeathersAdapterInterface, NotFound, BadRequest } from '@wingshq/adapter-commons'
import { MyWingsAdapter } from './wings-adapter.js'

export class FeathersMyAdapter<T extends Record<string, any>> 
  implements FeathersAdapterInterface<T> {
  
  private wingsService: MyWingsAdapter<T>
  
  constructor(options: MyAdapterOptions) {
    this.wingsService = new MyWingsAdapter(options)
  }

  get options() {
    return this.wingsService.options
  }

  async find(params?: FeathersParams): Promise<Paginated<T>> {
    // Always return paginated results for FeathersJS compatibility
    const result = await this.wingsService.find({ 
      ...params, 
      paginate: params?.paginate !== false 
    })
    
    if (Array.isArray(result)) {
      // Convert array to paginated format
      return {
        total: result.length,
        limit: params?.query?.$limit || result.length,
        skip: params?.query?.$skip || 0,
        data: result
      }
    }
    return result
  }

  async get(id: Primitive, params?: FeathersParams): Promise<T> {
    const result = await this.wingsService.get(id, params)
    if (result === null) {
      throw new NotFound(`No record found for id '${id}'`)
    }
    return result
  }

  async create(data: Partial<T> | Partial<T>[], params?: FeathersParams): Promise<T | T[]> {
    return this.wingsService.create(data, params)
  }

  async update(id: Primitive, data: T, params?: FeathersParams): Promise<T> {
    // FeathersJS update delegates to patch
    return this.patch(id, data, params) as Promise<T>
  }

  async patch(id: Primitive | null, data: Partial<T>, params?: FeathersParams): Promise<T | T[]> {
    if (id === null) {
      // Bulk operation - map to patchMany
      return this.wingsService.patchMany(data, { ...params, allowAll: true })
    } else {
      // Single operation
      const result = await this.wingsService.patch(id, data, params)
      if (result === null) {
        throw new NotFound(`No record found for id '${id}'`)
      }
      return result
    }
  }

  async remove(id: Primitive | null, params?: FeathersParams): Promise<T | T[]> {
    if (id === null) {
      // Bulk operation - map to removeMany
      return this.wingsService.removeMany({ ...params, allowAll: true })
    } else {
      // Single operation
      const result = await this.wingsService.remove(id, params)
      if (result === null) {
        throw new NotFound(`No record found for id '${id}'`)
      }
      return result
    }
  }
}
```

#### Step 2: Create FeathersJS Tests

```typescript
// test/feathers.test.ts
import { describe } from 'vitest'
import { commonTests, feathersTests, FEATHERS_CONFIG } from '@wingshq/adapter-tests'
import { FeathersMyAdapter } from '../src/feathers.js'

const createService = () => {
  return new FeathersMyAdapter({
    // Configuration for test database/storage
  })
}

describe('FeathersMyAdapter', () => {
  commonTests(createService, 'id', FEATHERS_CONFIG)
  feathersTests(createService, 'id')
})
```

#### Step 3: Update Package Exports

Export both interfaces from your package:

```json
{
  "name": "@wingshq/my-adapter",
  "exports": {
    ".": {
      "types": "./lib/index.d.ts",
      "import": "./esm/index.js",
      "require": "./lib/index.js"
    },
    "./feathers": {
      "types": "./lib/feathers.d.ts", 
      "import": "./esm/feathers.js",
      "require": "./lib/feathers.js"
    }
  }
}
```

This allows users to import either interface:
```typescript
// Wings interface
import { MyAdapter } from '@wingshq/my-adapter'

// FeathersJS interface  
import { FeathersMyAdapter } from '@wingshq/my-adapter/feathers'
```

## Test Configuration

### Test Configs

The test suite uses configuration objects to adapt test behavior:

```typescript
// Wings adapter configuration
export const WINGS_CONFIG: TestConfig = {
  throwOnNotFound: false,    // Return null instead of throwing
  alwaysPaginate: false,     // Return arrays by default
  supportsBulkViaNull: false, // Use explicit patchMany/removeMany
  supportsUpdate: false,     // Wings doesn't have update() method
  supportsLike: true,        // Database supports $like operator
  supportsIlike: true,       // Database supports $ilike operator  
  supportsIsNull: true       // Database supports $isNull operator
}

// FeathersJS adapter configuration
export const FEATHERS_CONFIG: TestConfig = {
  throwOnNotFound: true,     // Throw NotFound errors
  alwaysPaginate: true,      // Always return Paginated<T>
  supportsBulkViaNull: true, // Support patch(null) and remove(null)
  supportsUpdate: true,      // Has update() method
  supportsLike: false,       // Depends on adapter
  supportsIlike: false,      // Depends on adapter
  supportsIsNull: false      // Depends on adapter
}
```

### Service Factory Pattern

Always use the service factory pattern for proper test isolation:

```typescript
// ✅ Correct - Fresh instance per test
const createService = () => new MyAdapter()

// ❌ Incorrect - Shared instance causes test pollution
const service = new MyAdapter()
```

### Custom ID Properties

If your adapter uses a different ID property:

```typescript
// For adapters using '_id' instead of 'id'
commonTests(createService, '_id', WINGS_CONFIG)
wingsTests(createService, '_id')
```

## Best Practices

### 1. Test Organization
- Keep Wings and FeathersJS tests in separate files
- Use descriptive test file names: `wings.test.ts`, `feathers.test.ts`
- Group related functionality in test suites

### 2. Error Handling
- Wings adapters return `null` for not-found cases
- FeathersJS wrappers throw appropriate errors (`NotFound`, `BadRequest`)
- Always validate required parameters and throw meaningful errors

### 3. Type Safety
- Use TypeScript generics consistently: `MyAdapter<T extends Record<string, any>>`
- Implement proper return type overloads for `find()` method
- Ensure FeathersJS wrappers maintain type compatibility

### 4. Performance
- Use service factories to prevent test interference
- Clean up test data in `afterEach` hooks
- Implement efficient pagination with conditional COUNT queries

### 5. Query Operators
- Document which operators your adapter supports
- Use feature flags in test config to skip unsupported operators
- Implement database-specific operators where beneficial

## Real-World Examples

See these packages for complete implementation examples:

- **Wings Interface**: `@wingshq/db0`, `@wingshq/memory`
- **FeathersJS Wrappers**: `@wingshq/db0/feathers`
- **Test Files**: `packages/db0/test/wings.test.ts`, `packages/db0/test/feathers.test.ts`

## Authors

[Feathers contributors](https://github.com/feathersjs/adapter-tests/graphs/contributors)

## License

Copyright (c) 2023 [Feathers contributors](https://github.com/feathersjs/feathers/graphs/contributors)

Licensed under the [MIT license](LICENSE).
