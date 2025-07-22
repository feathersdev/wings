# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

### Development

- **Build all packages**: `npm run compile`
- **Run tests with coverage**: `npm test`
- **Run tests without coverage**: `npm run test:node`
- **Lint code**: `npm run lint` (runs both Prettier and ESLint)
- **Generate new adapter**: `npm run generate:adapter`

### Package-specific commands

Each package in `/packages` has its own commands:

- **Build individual package**: `cd packages/<package-name> && npm run compile`
- **Test individual package**: `cd packages/<package-name> && npm test`
- **Lint individual package**: `cd packages/<package-name> && npm run lint`
- **Lint and fix individual package**: `cd packages/<package-name> && npm run lint:fix`

**IMPORTANT**: All adapter packages must include the following scripts in their `package.json`:

```json
{
  "scripts": {
    "lint": "eslint \"src/**/*.ts\" \"test/**/*.ts\" --max-warnings 0",
    "lint:fix": "eslint \"src/**/*.ts\" \"test/**/*.ts\" --fix && prettier \"src/**/*.ts\" \"test/**/*.ts\" --write"
  }
}
```

This ensures:
- **Zero warnings policy**: `--max-warnings 0` enforces strict code quality
- **Auto-formatting**: `prettier` integration in `lint:fix` for consistent code style
- **Comprehensive coverage**: Both source and test files are linted

**IMPORTANT**: All Wings packages must use **vitest** for testing (not Node.js test runner) for consistency and better performance:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "vitest": "^3.2.4"
  }
}
```

**IMPORTANT**: Ensure your `tsconfig.json` includes both `src` and `test` directories:

```json
{
  "extends": "../../tsconfig",
  "include": [
    "src/**/*.ts",
    "test/**/*.ts"
  ],
  "compilerOptions": {
    "outDir": "lib"
  }
}
```

## Architecture Overview

Wings is a TypeScript monorepo that provides universal database adapters following the FeathersJS service pattern. The core architectural principle is to provide a unified interface (`AdapterInterface`) that works across different databases.

### Key Interfaces (FeathersJS)

All adapters implement the `AdapterInterface` from `@wingshq/adapter-commons`:

- `find()`: Query multiple records with filtering, sorting, pagination
- `get()`: Retrieve single record by ID (throws NotFound if not found)
- `create()`: Create one or more records
- `update()`: Replace entire record (throws NotFound if not found)
- `patch()`: Partially update record(s) (throws NotFound if not found)
- `remove()`: Delete record(s) (throws NotFound if not found)

### Key Interfaces (Wings)

The new Wings adapter interface builds on FeathersJS patterns but introduces several improvements for better database integration and performance:

**Core Methods:**

- `find()`: Query multiple records with automatic type inference for pagination
- `get()`: Retrieve single record by ID (returns `null` if not found)
- `create()`: Create one or more records
- `patch()`: Partially update record(s) - no separate `update()` method
- `patchMany()`: Bulk update with safety controls
- `remove()`: Delete single record by ID
- `removeMany()`: Bulk delete with safety controls
- `removeAll()`: Clear entire table

**Key Differences from FeathersJS:**

1. **Smart Pagination**: Returns arrays by default, only returns `Paginated<T>` when `params.paginate = true`

   ```typescript
   // Returns User[] directly
   const users = await service.find({ query: { name: 'Alice' } })

   // Returns Paginated<User> with total count
   const result = await service.find({ query: { name: 'Alice' }, paginate: true })
   ```

2. **Explicit Bulk Operations**: Uses dedicated `patchMany()` and `removeMany()` methods instead of `patch(id: null)` and `remove(id: null)`

3. **Null-Safe Returns**: Methods return `null` for not-found cases instead of throwing errors

4. **Enhanced Query Operators**: Includes SQL-specific operators like `$like`, `$ilike`, `$isNull`

5. **Safety Controls**: Bulk operations require `allowAll: true` to prevent accidental mass updates/deletions of all records

6. **TypeScript Overloads**: Automatic return type inference based on parameters (especially pagination)

### Query Syntax

Wings uses "OmniQuery Syntax" - a standardized query format across all adapters:

- `$limit`: Limit number of results
- `$skip`: Skip records for pagination
- `$sort`: Sort results (e.g., `{ name: 1, age: -1 }`)
- `$select`: Select specific fields
- Additional filters are adapter-specific but follow common patterns

### Package Structure

- **adapter-commons**: Core interfaces, utilities, and base classes all adapters use
- **adapter-tests**: Shared test suite to ensure adapter compliance
- **memory**: Reference in-memory implementation
- **mongodb**, **knex**, **kysely**: Database-specific adapters
- **db0**: Modern SQL adapter with Cloudflare Worker support
- **generators**: Pinion-based scaffolding for new adapters

### Creating New Adapters

1. Run `npm run generate:adapter` from root
2. Extend `AdapterBase` from `@wingshq/adapter-commons`
3. Implement required methods following existing adapter patterns
4. Use `@wingshq/adapter-tests` to validate implementation

### Testing Approach

- Each adapter has its own test file that imports the shared test suite
- Tests ensure consistent behavior across all adapters
- Use vitest for modern testing with better performance and developer experience
- Service factory pattern ensures proper test isolation
- Run coverage reports to ensure comprehensive testing

### Module Format

All packages support dual CommonJS/ESM:

- Source: `src/` (TypeScript)
- CommonJS: `lib/` (compiled)
- ESM: `esm/` (compiled)

## Development Tasks

The following tasks need to be completed to fully migrate the repository to the new Wings adapter interface:

### ✅ Completed Work

#### Test Suite Migration (adapter-tests)
- **Complete vitest migration**: Successfully migrated from Node.js test runner to vitest for better performance
- **Service factory pattern**: Implemented proper test isolation across all test suites
- **Three-tier test organization**: Created common/, wings/, and feathersjs/ test directories
- **Configuration-driven testing**: Test behavior adapts based on TestConfig (WINGS_CONFIG vs FEATHERS_CONFIG)
- **Comprehensive coverage**: 133+ tests covering all adapter patterns and edge cases
- **Code quality**: Added ESLint and Prettier configuration with zero warnings

#### db0 Adapter Implementation
- **Wings interface compliance**: Full implementation of modern Wings interface
- **FeathersJS wrapper**: Complete backwards compatibility layer with error throwing and pagination
- **Advanced query operators**: Full parity with knex adapter (`$like`, `$notlike`, proper NULL handling)
- **Database-agnostic error handling**: Pattern-based error classification to FeathersJS error types
- **Full test coverage**: All 192 tests passing (Wings + FeathersJS + centralized test suites)
- **Performance optimized**: Smart pagination with conditional COUNT queries

#### Knex Adapter Enhancements
- **Centralized testing**: Migrated duplicate tests to `adapter-tests` package for DRY compliance
- **Enhanced error handling**: Comprehensive database-specific error mapping (SQL State, SQLite, PostgreSQL)
- **Advanced query operators**: Full support for `$like`, `$notlike`, complex logical operations, NULL handling
- **Bug fixes**: Fixed pagination count queries and Wings interface compliance issues
- **Full test coverage**: All 283 tests passing with comprehensive error handling and query operator tests

#### Adapter-Tests Centralization
- **Test consolidation**: Centralized error handling and advanced query operator tests
- **DRY compliance**: Eliminated code duplication between adapters while maintaining full coverage
- **Consistent behavior**: All adapters now run identical test suites for common functionality
- **Enhanced coverage**: Added comprehensive Database Error Handling and Advanced Query Operators test suites

#### Documentation
- **Comprehensive README**: Complete development guide for creating Wings adapters and FeathersJS wrappers
- **Real-world examples**: Step-by-step instructions with actual implementation patterns
- **Best practices**: Professional guidelines for test organization, error handling, and TypeScript usage

### 🎯 Next Steps

### 1. Reorganize and Update Test Suites

**Package**: `@wingshq/adapter-tests`

The test suite needs to be reorganized to support three different interface types while maintaining comprehensive coverage:

#### Test Suite Organization:
- [x] **Create `common/` directory**: Tests that should pass for both Wings and FeathersJS interfaces
- [x] **Create `wings/` directory**: Tests specific to the Wings interface  
- [x] **Create `feathersjs/` directory**: Tests specific to the FeathersJS interface (preserve current tests)

#### Common Tests (`common/`):
Tests that work identically across both interfaces:
- [x] Basic CRUD operations with standard parameters
- [x] Query syntax (`$limit`, `$skip`, `$sort`, `$select`, `$or`, `$and`)
- [x] Standard query operators (`$in`, `$nin`, `$lt`, `$gt`, `$gte`, `$lte`, `$ne`)
- [x] Data validation and error handling for invalid inputs
- [x] Multiple record creation

#### Wings-Specific Tests (`wings/`):
Tests for Wings interface features:
- [x] `find()` pagination behavior (array vs `Paginated<T>` based on `params.paginate`)
- [x] Null return behavior for `get()`, `patch()`, `remove()` when not found
- [x] `patchMany()` method with `allowAll` safety controls
- [x] `removeMany()` method with `allowAll` safety controls
- [x] `removeAll()` method
- [x] Enhanced query operators: `$like`, `$ilike`, `$isNull`
- [x] TypeScript type inference validation

#### FeathersJS Interface Tests (`feathersjs/`):
Preserve existing FeathersJS tests:
- [x] **Preserve current test files**: Keep existing tests as-is for wrapper validation
- [x] `find()` always returns `Paginated<T>` objects
- [x] Error throwing behavior for not-found cases (`NotFound`, etc.)
- [x] `update()` method behavior
- [x] Bulk operations via `patch(id: null)` and `remove(id: null)`
- [x] Traditional FeathersJS error handling patterns

### 2. Migrate Existing Adapters

**Packages**: `@wingshq/knex`, `@wingshq/mongodb`, `@wingshq/memory`

Each existing adapter needs to be updated to implement the new Wings interface:

#### ✅ Knex Adapter (`@wingshq/knex`) - COMPLETED:

- [x] Update `find()` method signature with TypeScript overloads for pagination support
- [x] Update `get()`, `patch()`, `remove()` to return `null` instead of throwing on not-found
- [x] Remove `update()` method implementation
- [x] Add `patchMany(data, params)` method with `allowAll` safety control
- [x] Add `removeMany(params)` method with `allowAll` safety control
- [x] Add `removeAll()` method
- [x] Add support for `$like`, `$ilike`, `$isNull` query operators where applicable
- [x] Implement SQL-specific operators (`$like`, `$ilike`) using Knex query builder
- [x] Update pagination logic to conditionally execute COUNT queries
- [x] Ensure proper SQL identifier quoting for different dialects
- [x] **BONUS**: Comprehensive database-specific error handling (SQL State, SQLite, PostgreSQL)
- [x] **BONUS**: Centralized testing with `adapter-tests` package integration

#### ✅ MongoDB Adapter (`@wingshq/mongodb`) - COMPLETED:

- [x] Update `find()` method signature with TypeScript overloads for pagination support
- [x] Update `get()`, `patch()`, `remove()` to return `null` instead of throwing on not-found
- [x] Remove `update()` method implementation
- [x] Add `patchMany(data, params)` method with `allowAll` safety control
- [x] Add `removeMany(params)` method with `allowAll` safety control
- [x] Add `removeAll()` method
- [x] Add support for `$like`, `$ilike`, `$isNull` query operators where applicable
- [x] Map `$like` to MongoDB `$regex` operators
- [x] Map `$ilike` to case-insensitive `$regex` operators
- [x] Map `$isNull` to MongoDB `$exists` operators
- [x] Update aggregation pipeline for pagination when needed
- [x] **BONUS**: FeathersJS wrapper implementation with full backwards compatibility
- [x] **BONUS**: Centralized testing with `adapter-tests` package integration
- [x] **BONUS**: Advanced SQL-like query operator conversion to MongoDB equivalents

#### Memory Adapter (`@wingshq/memory`):

- [ ] Update `find()` method signature with TypeScript overloads for pagination support
- [ ] Update `get()`, `patch()`, `remove()` to return `null` instead of throwing on not-found
- [ ] Remove `update()` method implementation
- [ ] Add `patchMany(data, params)` method with `allowAll` safety control
- [ ] Add `removeMany(params)` method with `allowAll` safety control
- [ ] Add `removeAll()` method
- [ ] Add support for `$like`, `$ilike`, `$isNull` query operators where applicable
- [ ] Implement in-memory equivalents for `$like` (string includes/regex matching)
- [ ] Implement in-memory equivalents for `$ilike` (case-insensitive matching)
- [ ] Implement in-memory equivalents for `$isNull` (null/undefined checks)

### 3. Verification

Current Status:

- [x] **db0 and knex adapters**: Pass all updated test suites with full parity (192 and 283 tests respectively)
- [x] **Consistent behavior**: Both adapters implement identical Wings and FeathersJS interfaces 
- [x] **TypeScript compilation**: Full type safety with proper method overloading and inference
- [x] **Documentation**: Updated to reflect completed Wings interface migration and centralized testing
- [x] **MongoDB adapter**: Completed with full Wings interface and FeathersJS wrapper
- [ ] **Memory adapter**: Needs updates to use new centralized test signatures

### 4. Create FeathersJS Compatibility Wrappers

**Packages**: `@wingshq/knex/feathers`, `@wingshq/mongodb/feathers`, `@wingshq/memory/feathers`, `@wingshq/db0/feathers`

After all adapters are fully migrated to the Wings interface and passing tests, create FeathersJS wrapper packages for backwards compatibility:

#### Wrapper Requirements:

- [x] **Restore FeathersJS API**: Provide exact FeathersJS interface/API surface *(Completed for db0)*
- [x] **Error Handling**: Convert `null` returns back to FeathersJS error throwing (NotFound, etc.) *(Completed for db0)*
- [x] **Pagination**: Always return `Paginated<T>` objects (set `paginate: true` internally unless paginate:false is explicitly passed) *(Completed for db0)*
- [x] **Bulk Operations**: Map `patch(id: null, data, params)` to `patchMany(data, { ...params, allowAll: true })` *(Completed for db0)*
- [x] **Bulk Operations**: Map `remove(id: null, params)` to `removeMany({ ...params, allowAll: true })` *(Completed for db0)*
- [x] **Update Method**: Restore `update()` method (can delegate to `patch()` internally) *(Completed for db0)*
- [x] **Query Compatibility**: Ensure all existing FeathersJS query syntax works unchanged *(Completed for db0)*

#### Implementation Strategy:

```typescript
// Example wrapper pattern
export class FeathersKnexService<T> implements FeathersAdapterInterface<T> {
  constructor(private wingsService: WingsKnexService<T>) {}

  async find(params?: Params): Promise<Paginated<T>> {
    // Always paginate for FeathersJS compatibility
    return this.wingsService.find({ ...params, paginate: true })
  }

  async get(id: Id, params?: Params): Promise<T> {
    const result = await this.wingsService.get(id, params)
    if (result === null) {
      throw new NotFound(`No record found for id '${id}'`)
    }
    return result
  }

  async patch(id: Id | null, data: Partial<T>, params?: Params): Promise<T | T[]> {
    if (id === null) {
      // Bulk operation - delegate to patchMany
      return this.wingsService.patchMany(data, params)
    } else {
      // Single operation
      const result = await this.wingsService.patch(id, data, params)
      if (result === null) {
        throw new NotFound(`No record found for id '${id}'`)
      }
      return result
    }
  }

  async update(id: Id, data: T, params?: Params): Promise<T> {
    // Delegate to patch since Wings doesn't have update
    return this.patch(id, data, params) as Promise<T>
  }

  // ... other methods
}
```

#### Testing Strategy:

- [x] **Common Tests**: Run shared `common/` tests against wrappers to ensure core functionality *(Completed for db0)*
- [x] **FeathersJS Tests**: Run preserved `feathersjs/` tests against wrappers for 100% backwards compatibility *(Completed for db0)*
- [x] **Integration Tests**: Verify wrappers work with existing FeathersJS applications unchanged *(Completed for db0)*
- [x] **Error Compatibility**: Ensure error messages and types exactly match original FeathersJS adapters *(Completed for db0)*
- [x] **Performance Tests**: Verify wrappers maintain acceptable performance while providing compatibility layer *(Completed for db0)*

#### Test Execution Strategy:
```bash
# Test Wings adapters with Wings interface
npm run test:wings

# Test Wings adapters with common interface  
npm run test:common:wings

# Test FeathersJS wrappers with FeathersJS interface
npm run test:feathersjs

# Test FeathersJS wrappers with common interface
npm run test:common:feathersjs

# Full test suite
npm run test:all
```

This approach provides:

- **Clean Migration Path**: Users can migrate from FeathersJS adapters to Wings wrappers with zero code changes
- **Performance Options**: Advanced users can opt into Wings interface for better performance
- **Ecosystem Compatibility**: Existing FeathersJS tooling and documentation remains valid
