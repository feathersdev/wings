# @wingshq/memory

[![CI](https://github.com/wingshq/wings/workflows/CI/badge.svg)](https://github.com/wingshq/wings/actions?query=workflow%3ACI)
[![npm version](https://img.shields.io/npm/v/@wingshq/memory.svg)](https://www.npmjs.com/package/@wingshq/memory)
[![Downloads](https://img.shields.io/npm/dm/@wingshq/memory.svg)](https://www.npmjs.com/package/@wingshq/memory)
[![License](https://img.shields.io/npm/l/@wingshq/memory.svg)](https://github.com/wingshq/wings/blob/main/LICENSE)

A fast, lightweight in-memory database adapter for Wings and FeathersJS applications. Perfect for development, testing, and applications with small datasets that can fit in memory.

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [API Documentation](#api-documentation)
  - [Wings Interface](#wings-interface)
  - [FeathersJS Interface](#feathersjs-interface)
  - [Configuration Options](#configuration-options)
- [Query Syntax](#query-syntax)
- [Advanced Features](#advanced-features)
- [Error Handling](#error-handling)
- [Migration Guide](#migration-guide)
- [TypeScript Support](#typescript-support)
- [Testing](#testing)
- [Contributing](#contributing)
- [License](#license)

## Overview

The memory adapter provides a full-featured database adapter that stores data in memory. It supports:

- ✅ **Full Wings Interface**: Modern API with null-safe returns and explicit bulk operations
- ✅ **FeathersJS Compatibility**: Drop-in replacement for existing FeathersJS applications
- ✅ **Rich Query Syntax**: Including `$like`, `$ilike`, `$isNull`, and all standard operators
- ✅ **Custom ID Fields**: Support for custom primary key fields
- ✅ **TypeScript First**: Full TypeScript support with generics
- ✅ **Zero Dependencies**: Only depends on sift for query matching
- ✅ **Synchronous Operations**: All operations complete immediately (wrapped in Promises)

## Installation

```bash
npm install @wingshq/memory
```

```bash
yarn add @wingshq/memory
```

```bash
pnpm add @wingshq/memory
```

## Quick Start

### Wings Interface

```typescript
import { MemoryAdapter } from '@wingshq/memory'

interface User {
  id: number
  name: string
  email: string
  age: number
}

// Create adapter instance
const users = new MemoryAdapter<User>({
  id: 'id',
  startId: 1
})

// Create a user
const user = await users.create({
  name: 'Alice Johnson',
  email: 'alice@example.com',
  age: 30
})

// Find users with pagination
const result = await users.find({
  query: {
    age: { $gte: 18 },
    $sort: { name: 1 },
    $limit: 10
  },
  paginate: true
})
console.log(result.data) // Array of users
console.log(result.total) // Total count
```

### FeathersJS Interface

```typescript
import { FeathersMemoryAdapter } from '@wingshq/memory/feathers'

// Drop-in replacement for @feathersjs/memory
const users = new FeathersMemoryAdapter({
  id: 'id',
  startId: 1,
  paginate: {
    default: 10,
    max: 50
  }
})

// FeathersJS-style pagination (always returns paginated results)
const result = await users.find({
  query: {
    $sort: { createdAt: -1 }
  }
})
// Returns: { total: number, limit: number, skip: number, data: User[] }
```

## API Documentation

### Wings Interface

The Wings interface provides a modern, type-safe API with explicit operations:

#### Constructor Options

```typescript
interface MemoryOptions<T = any> {
  id?: string          // Primary key field name (default: 'id')
  startId?: number     // Starting ID for auto-increment (default: 0)
  Model?: MemoryStore<T>  // Initial data store
  matcher?: (query: any) => any  // Custom query matcher (default: sift)
  sorter?: (sort: any) => any    // Custom sort function
}
```

#### Methods

##### find()

```typescript
// Return array by default
const users = await adapter.find({
  query: { active: true }
}) // Returns: User[]

// Return paginated results
const result = await adapter.find({
  query: { active: true },
  paginate: true
}) // Returns: { total: number, limit: number, skip: number, data: User[] }
```

##### get()

```typescript
// Returns null if not found (no error thrown)
const user = await adapter.get(123)
if (user === null) {
  console.log('User not found')
}
```

##### create()

```typescript
// Create single record
const user = await adapter.create({
  name: 'Bob',
  email: 'bob@example.com'
})

// Create multiple records
const users = await adapter.create([
  { name: 'Alice', email: 'alice@example.com' },
  { name: 'Charlie', email: 'charlie@example.com' }
])
```

##### patch()

```typescript
// Patch single record (returns null if not found)
const updated = await adapter.patch(123, {
  status: 'active'
})

// Bulk patch with patchMany
const updated = await adapter.patchMany(
  { status: 'archived' },
  { 
    query: { createdAt: { $lt: oldDate } },
    allowAll: false  // Safety check required
  }
)
```

##### remove()

```typescript
// Remove single record (returns null if not found)
const removed = await adapter.remove(123)

// Bulk remove with removeMany
const removed = await adapter.removeMany({
  query: { status: 'deleted' },
  allowAll: false  // Safety check required
})

// Remove all records
const all = await adapter.removeAll()
```

### FeathersJS Interface

The FeathersJS wrapper maintains full backwards compatibility:

#### Key Differences

- Always throws `NotFound` errors instead of returning null
- `find()` returns paginated results by default unless `paginate: false`
- Supports `update()` method for full record replacement
- Bulk operations via `patch(null, data)` and `remove(null)`

```typescript
import { FeathersMemoryAdapter } from '@wingshq/memory/feathers'

const adapter = new FeathersMemoryAdapter<User>()

// Always paginated by default
const result = await adapter.find({}) 
// Returns: { total, limit, skip, data }

// Throws NotFound error
try {
  await adapter.get(999)
} catch (error) {
  console.log(error.message) // "No record found for id '999'"
}

// Update (full replacement)
const updated = await adapter.update(123, {
  name: 'New Name',
  email: 'new@example.com',
  age: 25
})

// Bulk operations (FeathersJS style)
await adapter.patch(null, { archived: true }, {
  query: { status: 'inactive' }
})
```

### Configuration Options

#### Custom ID Field

```typescript
const adapter = new MemoryAdapter<Document>({
  id: '_id',  // Use _id as primary key
  startId: 1000
})
```

#### Pre-populated Data

```typescript
const adapter = new MemoryAdapter<Product>({
  Model: {
    1: { id: 1, name: 'Widget', price: 9.99 },
    2: { id: 2, name: 'Gadget', price: 19.99 }
  }
})
```

#### Custom Matcher

```typescript
const adapter = new MemoryAdapter({
  matcher: (query) => {
    // Custom query matching logic
    return (item) => {
      // Return true if item matches query
    }
  }
})
```

## Query Syntax

### Basic Queries

```typescript
// Equality
await adapter.find({ query: { status: 'active' } })

// Multiple conditions (AND)
await adapter.find({ 
  query: { 
    status: 'active',
    age: { $gte: 18 }
  } 
})
```

### Comparison Operators

```typescript
// Greater than / Greater than or equal
await adapter.find({ query: { age: { $gt: 21 } } })
await adapter.find({ query: { age: { $gte: 21 } } })

// Less than / Less than or equal
await adapter.find({ query: { price: { $lt: 100 } } })
await adapter.find({ query: { price: { $lte: 100 } } })

// Not equal
await adapter.find({ query: { status: { $ne: 'deleted' } } })

// In / Not in
await adapter.find({ query: { role: { $in: ['admin', 'moderator'] } } })
await adapter.find({ query: { status: { $nin: ['deleted', 'banned'] } } })
```

### Text Search Operators

```typescript
// Case-sensitive pattern matching (SQL LIKE)
await adapter.find({ query: { email: { $like: '%@gmail.com' } } })
await adapter.find({ query: { name: { $like: 'John%' } } })

// Case-insensitive pattern matching (SQL ILIKE)
await adapter.find({ query: { name: { $ilike: '%smith%' } } })

// Not like
await adapter.find({ query: { email: { $notlike: '%@temp-mail.%' } } })
```

### Null Handling

```typescript
// Find records where field is null or undefined
await adapter.find({ query: { deletedAt: { $isNull: true } } })

// Find records where field is not null
await adapter.find({ query: { deletedAt: { $isNull: false } } })
```

### Logical Operators

```typescript
// OR conditions
await adapter.find({
  query: {
    $or: [
      { status: 'active' },
      { role: 'admin' }
    ]
  }
})

// AND conditions (explicit)
await adapter.find({
  query: {
    $and: [
      { age: { $gte: 18 } },
      { age: { $lt: 65 } }
    ]
  }
})

// Nested conditions
await adapter.find({
  query: {
    $or: [
      { 
        $and: [
          { status: 'active' },
          { age: { $gte: 18 } }
        ]
      },
      { role: 'admin' }
    ]
  }
})
```

### Pagination and Sorting

```typescript
// Sorting
await adapter.find({
  query: {
    $sort: { 
      createdAt: -1,  // Descending
      name: 1         // Ascending
    }
  }
})

// Pagination
await adapter.find({
  query: {
    $limit: 20,
    $skip: 40,  // Page 3 with 20 items per page
    $sort: { createdAt: -1 }
  }
})

// Field selection
await adapter.find({
  query: {
    $select: ['id', 'name', 'email']  // Only return these fields
  }
})
```

## Advanced Features

### Bulk Operations with Safety Controls

```typescript
// Bulk update with safety
try {
  await adapter.patchMany(
    { status: 'archived' },
    { query: {} }  // No query specified
  )
} catch (error) {
  // Error: "No query provided and allowAll is not set"
}

// Explicitly allow all
await adapter.patchMany(
  { status: 'archived' },
  { allowAll: true }
)
```

### Custom Query Matching

```typescript
import sift from 'sift'

const adapter = new MemoryAdapter({
  matcher: (query) => {
    // Add custom operators
    const customQuery = { ...query }
    
    if (query.$search) {
      // Implement full-text search
      return (item) => {
        const searchTerm = query.$search.toLowerCase()
        return Object.values(item).some(value => 
          String(value).toLowerCase().includes(searchTerm)
        )
      }
    }
    
    return sift(customQuery)
  }
})

// Use custom operator
await adapter.find({ query: { $search: 'john' } })
```

### Transaction-like Operations

```typescript
// Since memory adapter is synchronous, you can implement transaction-like behavior
class TransactionalMemoryAdapter<T> extends MemoryAdapter<T> {
  private snapshot: any = null
  
  beginTransaction() {
    this.snapshot = JSON.parse(JSON.stringify(this.Model))
  }
  
  rollback() {
    if (this.snapshot) {
      this.Model = this.snapshot
      this.snapshot = null
    }
  }
  
  commit() {
    this.snapshot = null
  }
}
```

## Error Handling

### Wings Interface (Null Returns)

```typescript
// No errors thrown for not found
const user = await adapter.get(999)
if (user === null) {
  // Handle not found case
}

// Validation errors
try {
  await adapter.patch(null as any, { name: 'Test' })
} catch (error) {
  // BadRequest: patch() requires a non-null id
}
```

### FeathersJS Interface (Error Throwing)

```typescript
import { NotFound, BadRequest } from '@feathersjs/errors'

try {
  await feathersAdapter.get(999)
} catch (error) {
  if (error instanceof NotFound) {
    console.log('User not found')
  }
}

try {
  await feathersAdapter.update(null, {})
} catch (error) {
  if (error instanceof BadRequest) {
    console.log(error.message) // "You can not replace multiple instances"
  }
}
```

## Migration Guide

### From @feathersjs/memory

```typescript
// Before
import memory from '@feathersjs/memory'
const service = memory({
  id: '_id',
  startId: 1,
  paginate: {
    default: 10,
    max: 50
  }
})

// After (FeathersJS compatibility)
import { FeathersMemoryAdapter } from '@wingshq/memory/feathers'
const service = new FeathersMemoryAdapter({
  id: '_id',
  startId: 1
})
// Note: Pagination is handled differently in Wings
```

### Migrating to Wings Interface

```typescript
// FeathersJS style
try {
  const user = await service.get(id)
} catch (error) {
  if (error.name === 'NotFound') {
    // Handle not found
  }
}

// Wings style
const user = await adapter.get(id)
if (user === null) {
  // Handle not found
}

// Bulk operations
// FeathersJS style
await service.patch(null, { archived: true }, { query })

// Wings style
await adapter.patchMany({ archived: true }, { query, allowAll: false })
```

## TypeScript Support

### Type-Safe Adapters

```typescript
interface User {
  id: number
  email: string
  name: string
  role: 'user' | 'admin'
  createdAt: Date
}

const users = new MemoryAdapter<User>()

// TypeScript enforces correct types
await users.create({
  email: 'test@example.com',
  name: 'Test User',
  role: 'user',
  createdAt: new Date()
})

// Type error: role must be 'user' | 'admin'
await users.create({
  email: 'test@example.com',
  name: 'Test',
  role: 'superadmin' // ❌ Type error
})
```

### Custom ID Types

```typescript
interface Document {
  _id: string
  content: string
}

const docs = new MemoryAdapter<Document>({
  id: '_id'
})

// ID type is inferred as string
const doc = await docs.get('abc123') // ✅ Correct
```

### Query Type Safety

```typescript
// Queries are partially type-checked
await users.find({
  query: {
    role: { $in: ['user', 'admin'] }, // ✅ Valid roles
    age: { $gte: 18 } // ❌ Type error if User doesn't have age field
  }
})
```

## Testing

The memory adapter is perfect for testing:

```typescript
import { MemoryAdapter } from '@wingshq/memory'
import { beforeEach, describe, it, expect } from 'vitest'

describe('UserService', () => {
  let userService: UserService
  let adapter: MemoryAdapter<User>

  beforeEach(() => {
    // Fresh adapter for each test
    adapter = new MemoryAdapter<User>()
    userService = new UserService(adapter)
  })

  it('should create user with unique email', async () => {
    await adapter.create({ 
      id: 1, 
      email: 'existing@example.com', 
      name: 'Existing' 
    })

    await expect(
      userService.register('existing@example.com', 'Test')
    ).rejects.toThrow('Email already exists')
  })
})
```

### Running Package Tests

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm test -- --coverage
```

## Contributing

See the [main contributing guide](https://github.com/wingshq/wings/blob/main/CONTRIBUTING.md) for details on how to contribute to this project.

## License

[MIT](https://github.com/wingshq/wings/blob/main/LICENSE)