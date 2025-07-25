# Wings Adapter Commons

[![CI](https://github.com/feathersjs/feathers/workflows/Node.js%20CI/badge.svg)](https://github.com/feathersjs/feathers/actions?query=workflow%3A%22Node.js+CI%22)
[![Download Status](https://img.shields.io/npm/dm/@feathersjs/adapter-commons.svg?style=flat-square)](https://www.npmjs.com/package/@feathersjs/adapter-commons)
[![Discord](https://badgen.net/badge/icon/discord?icon=discord&label)](https://discord.gg/qa8kez8QBx)

> Core interfaces, utilities, and base classes for Wings database adapters

## Installation

```bash
npm install @wingshq/adapter-commons
```

## Overview

This package provides the foundation for building Wings database adapters with consistent interfaces and shared functionality.

## AdapterBase Class

The `AdapterBase` class provides common functionality that all Wings adapters inherit, reducing code duplication and ensuring consistent behavior across adapters.

```typescript
import { AdapterBase } from '@wingshq/adapter-commons'

export class MyAdapter<T> extends AdapterBase<T> {
  constructor(options: MyAdapterOptions) {
    super(options)
  }

  // Implement abstract methods...
}
```

### Inherited Methods

#### Query Processing
- `filterQuery(params)` - Separates query operators (`$limit`, `$skip`, `$sort`, `$select`) from the actual query

#### Validation
- `validateNonNullId(id, operation)` - Ensures ID is not null/undefined for single operations
- `validateBulkParams(query, allowAll, operation)` - Validates bulk operations require either a query or explicit `allowAll: true`

#### Result Building
- `buildPaginatedResult(data, total, filters)` - Creates properly formatted `Paginated<T>` results

#### Query Conversion (for non-SQL databases)
- `convertSqlLikeOperators(query)` - Converts SQL-like operators to database-specific formats:
  - `$like` → regex patterns
  - `$ilike` → case-insensitive regex
  - `$isNull` → null equality checks

### Example Implementation

```typescript
import { AdapterBase, Primitive, Paginated } from '@wingshq/adapter-commons'

export class MyAdapter<T> extends AdapterBase<T> {
  async find(params?: any): Promise<T[] | Paginated<T>> {
    const { filters, query } = this.filterQuery(params)
    
    // For non-SQL databases, convert operators
    const convertedQuery = this.convertSqlLikeOperators(query)
    
    const data = await this.queryDatabase(convertedQuery, filters)
    
    if (params?.paginate) {
      const total = await this.countRecords(convertedQuery)
      return this.buildPaginatedResult(data, total, filters)
    }
    
    return data
  }

  async patch(id: Primitive, data: Partial<T>, params?: any): Promise<T | null> {
    this.validateNonNullId(id, 'patch')
    // Implementation
  }

  async patchMany(data: Partial<T>, params: any): Promise<T[]> {
    this.validateBulkParams(params.query, params.allowAll, 'patch')
    // Implementation
  }
}
```

## Interfaces

### WingsAdapterInterface

The modern Wings adapter interface with null returns and explicit bulk operations:

```typescript
interface WingsAdapterInterface<Result> {
  find(params?: Params): Promise<Result[] | Paginated<Result>>
  get(id: Primitive, params?: Params): Promise<Result | null>
  create(data: Data | Data[], params?: Params): Promise<Result | Result[]>
  patch(id: Primitive, data: PatchData, params?: Params): Promise<Result | null>
  patchMany(data: PatchData, params: Params & { allowAll?: boolean }): Promise<Result[]>
  remove(id: Primitive, params?: Params): Promise<Result | null>
  removeMany(params: Params & { allowAll?: boolean }): Promise<Result[]>
  removeAll(params?: Params): Promise<Result[]>
}
```

### AdapterInterface

The traditional FeathersJS adapter interface for backwards compatibility.

## Utilities

- `select(params, ...fields)` - Filter results by `$select`
- `sorter(sort)` - Create sorting functions

## Documentation

Refer to the [Feathers database adapter documentation](https://feathersjs.com/api/databases/common.html) for more details.

## Authors

[Feathers contributors](https://github.com/feathersjs/adapter-commons/graphs/contributors)

## License

Copyright (c) 2023 [Feathers contributors](https://github.com/feathersjs/feathers/graphs/contributors)

Licensed under the [MIT license](LICENSE).
