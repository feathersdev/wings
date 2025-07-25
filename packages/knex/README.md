# @wingshq/knex

[![CI](https://github.com/wingshq/wings/workflows/CI/badge.svg)](https://github.com/wingshq/wings/actions?query=workflow%3ACI)
[![npm version](https://img.shields.io/npm/v/@wingshq/knex.svg)](https://www.npmjs.com/package/@wingshq/knex)
[![Downloads](https://img.shields.io/npm/dm/@wingshq/knex.svg)](https://www.npmjs.com/package/@wingshq/knex)
[![License](https://img.shields.io/npm/l/@wingshq/knex.svg)](https://github.com/wingshq/wings/blob/main/LICENSE)

A high-performance SQL database adapter for Wings and FeathersJS applications, built on the powerful Knex.js query builder. Supports PostgreSQL, MySQL, SQLite, and more.

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

The knex adapter provides a feature-rich SQL database adapter with support for:

- ✅ **Full Wings Interface**: Modern API with null-safe returns and explicit bulk operations
- ✅ **FeathersJS Compatibility**: Drop-in replacement for existing FeathersJS applications
- ✅ **Multiple Databases**: PostgreSQL, MySQL, SQLite, MSSQL, Oracle, and more
- ✅ **Rich Query Syntax**: Including `$like`, `$ilike`, `$isNull`, and all standard operators
- ✅ **Advanced SQL Features**: Transactions, joins, raw queries, and aggregations
- ✅ **TypeScript First**: Full TypeScript support with generics
- ✅ **Battle-Tested**: Built on Knex.js, used in production by thousands of applications
- ✅ **Connection Pooling**: Efficient database connection management

## Installation

```bash
npm install @wingshq/knex knex
```

```bash
yarn add @wingshq/knex knex
```

```bash
pnpm add @wingshq/knex knex
```

You'll also need to install the appropriate database driver:

```bash
# PostgreSQL
npm install pg

# MySQL/MariaDB
npm install mysql2

# SQLite
npm install sqlite3

# MSSQL
npm install tedious

# Oracle
npm install oracledb
```

## Quick Start

### Wings Interface

```typescript
import { KnexService } from '@wingshq/knex'
import knex from 'knex'

interface User {
  id: number
  name: string
  email: string
  age: number
  createdAt: Date
}

// Create database connection
// Option 1: PostgreSQL
const db = knex({
  client: 'pg',
  connection: {
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'myapp'
  },
  pool: {
    min: 2,
    max: 10
  }
})

// Option 2: SQLite
// const db = knex({
//   client: 'sqlite3',
//   connection: {
//     filename: './myapp.db'
//   },
//   useNullAsDefault: true
// })

// Create service instance
const users = new KnexService<User>({
  Model: db,
  name: 'users',
  id: 'id'
})

// Create a user
const user = await users.create({
  name: 'Alice Johnson',
  email: 'alice@example.com',
  age: 30,
  createdAt: new Date()
})

// Find users with pagination
const result = await users.find({
  query: {
    age: { $gte: 18 },
    $sort: { createdAt: -1 },
    $limit: 10
  },
  paginate: true
})
console.log(result.data) // Array of users
console.log(result.total) // Total count
```

### FeathersJS Interface

```typescript
import { FeathersKnexService } from '@wingshq/knex/feathers'
import knex from 'knex'

// Drop-in replacement for @feathersjs/knex
const db = knex({
  client: 'sqlite3',
  connection: {
    filename: './data.db'
  },
  useNullAsDefault: true
})

const users = new FeathersKnexService({
  Model: db,
  name: 'users',
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
interface KnexServiceOptions<T = any> {
  Model: Knex                    // Knex instance
  name: string                   // Table name
  id?: string                    // Primary key field (default: 'id')
  schema?: string                // Database schema (PostgreSQL)
  multi?: boolean | string[]     // Enable multi-record operations
  whitelist?: string[]           // Allowed query operators
  filters?: Record<string, any>  // Custom query filters
  operators?: string[]           // Additional operators to allow
}
```

#### Methods

##### find()

```typescript
// Return array by default
const users = await service.find({
  query: { active: true }
}) // Returns: User[]

// Return paginated results
const result = await service.find({
  query: { active: true },
  paginate: true
}) // Returns: { total: number, limit: number, skip: number, data: User[] }

// With advanced queries
const result = await service.find({
  query: {
    age: { $between: [18, 65] },
    email: { $like: '%@company.com' },
    $sort: { createdAt: -1 },
    $select: ['id', 'name', 'email']
  }
})
```

##### get()

```typescript
// Returns null if not found (no error thrown)
const user = await service.get(123)
if (user === null) {
  console.log('User not found')
}

// With query parameters
const user = await service.get(123, {
  query: {
    $select: ['id', 'name', 'email']
  }
})
```

##### create()

```typescript
// Create single record
const user = await service.create({
  name: 'Bob Smith',
  email: 'bob@example.com'
})

// Create multiple records
const users = await service.create([
  { name: 'Alice', email: 'alice@example.com' },
  { name: 'Charlie', email: 'charlie@example.com' }
])

// With database defaults
const user = await service.create({
  name: 'Dave'
  // createdAt will be set by database default
})
```

##### patch()

```typescript
// Patch single record (returns null if not found)
const updated = await service.patch(123, {
  status: 'active',
  lastLogin: new Date()
})

// Bulk patch with patchMany
const updated = await service.patchMany(
  { status: 'archived' },
  { 
    query: { 
      lastLogin: { $lt: thirtyDaysAgo } 
    },
    allowAll: false  // Safety check required
  }
)
```

##### remove()

```typescript
// Remove single record (returns null if not found)
const removed = await service.remove(123)

// Bulk remove with removeMany
const removed = await service.removeMany({
  query: { 
    status: 'deleted',
    deletedAt: { $lt: sevenDaysAgo }
  },
  allowAll: false  // Safety check required
})

// Remove all records (use with caution!)
const all = await service.removeAll()
```

### FeathersJS Interface

The FeathersJS wrapper maintains full backwards compatibility:

#### Key Differences

- Always throws `NotFound` errors instead of returning null
- `find()` returns paginated results by default unless `paginate: false`
- Supports `update()` method for full record replacement
- Bulk operations via `patch(null, data)` and `remove(null)`

```typescript
import { FeathersKnexService } from '@wingshq/knex/feathers'

const service = new FeathersKnexService<User>({
  Model: db,
  name: 'users'
})

// Always paginated by default
const result = await service.find({}) 
// Returns: { total, limit, skip, data }

// Throws NotFound error
try {
  await service.get(999)
} catch (error) {
  console.log(error.message) // "No record found for id '999'"
}

// Update (full replacement)
const updated = await service.update(123, {
  name: 'New Name',
  email: 'new@example.com',
  age: 25
})

// Bulk operations (FeathersJS style)
await service.patch(null, { archived: true }, {
  query: { status: 'inactive' }
})
```

### Configuration Options

#### Database Connection

```typescript
// PostgreSQL - Standard connection
const db = knex({
  client: 'pg',
  connection: {
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'myapp'
  },
  pool: {
    min: 2,
    max: 10
  }
})

// PostgreSQL - Connection string
const db = knex({
  client: 'pg',
  connection: 'postgres://user:password@localhost:5432/myapp',
  pool: {
    min: 2,
    max: 10
  }
})

// PostgreSQL - Environment variable
const db = knex({
  client: 'pg',
  connection: process.env.DATABASE_URL,
  pool: {
    min: 2,
    max: 10
  }
})

// PostgreSQL with SSL (AWS RDS, Heroku, etc.)
const db = knex({
  client: 'pg',
  connection: {
    host: 'your-database.amazonaws.com',
    port: 5432,
    user: 'dbuser',
    password: 'dbpass',
    database: 'mydb',
    ssl: { rejectUnauthorized: false }
  },
  pool: {
    min: 2,
    max: 10,
    idleTimeoutMillis: 30000,
    createTimeoutMillis: 30000,
    acquireTimeoutMillis: 30000
  }
})

// PostgreSQL with custom search_path
const db = knex({
  client: 'pg',
  connection: {
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'myapp'
  },
  searchPath: ['public', 'myschema'],
  pool: {
    afterCreate: function (conn, done) {
      // Runs after a connection is made to the database
      conn.query('SET timezone="UTC";', function (err) {
        if (err) {
          done(err, conn);
        } else {
          done(null, conn);
        }
      });
    }
  }
})

// MySQL with custom settings
const db = knex({
  client: 'mysql2',
  connection: {
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'password',
    database: 'myapp',
    charset: 'utf8mb4'
  },
  pool: {
    min: 2,
    max: 10
  }
})

// SQLite - File-based
const db = knex({
  client: 'sqlite3',
  connection: {
    filename: './myapp.db'
  },
  useNullAsDefault: true
})

// SQLite - In-memory (great for testing)
const db = knex({
  client: 'sqlite3',
  connection: ':memory:',
  useNullAsDefault: true
})
```

#### Schema Support (PostgreSQL)

```typescript
const service = new KnexService({
  Model: db,
  name: 'users',
  schema: 'public'  // or 'myschema'
})
```

#### Custom ID Field

```typescript
const service = new KnexService<Document>({
  Model: db,
  name: 'documents',
  id: 'uuid'  // Use uuid as primary key
})
```

#### Whitelist Operators

```typescript
const service = new KnexService({
  Model: db,
  name: 'users',
  whitelist: ['$eq', '$ne', '$in', '$nin', '$lt', '$lte', '$gt', '$gte'],
  operators: ['$like', '$ilike']  // Add additional operators
})
```

## Query Syntax

### Basic Queries

```typescript
// Equality
await service.find({ query: { status: 'active' } })

// Multiple conditions (AND)
await service.find({ 
  query: { 
    status: 'active',
    age: { $gte: 18 }
  } 
})
```

### Comparison Operators

```typescript
// Greater than / Greater than or equal
await service.find({ query: { age: { $gt: 21 } } })
await service.find({ query: { age: { $gte: 21 } } })

// Less than / Less than or equal
await service.find({ query: { price: { $lt: 100 } } })
await service.find({ query: { price: { $lte: 100 } } })

// Not equal
await service.find({ query: { status: { $ne: 'deleted' } } })

// In / Not in
await service.find({ query: { role: { $in: ['admin', 'moderator'] } } })
await service.find({ query: { status: { $nin: ['deleted', 'banned'] } } })

// Between (SQL BETWEEN)
await service.find({ query: { age: { $between: [18, 65] } } })
await service.find({ query: { price: { $notBetween: [0, 10] } } })
```

### Text Search Operators

```typescript
// Case-sensitive pattern matching (SQL LIKE)
await service.find({ query: { email: { $like: '%@gmail.com' } } })
await service.find({ query: { name: { $like: 'John%' } } })

// Case-insensitive pattern matching (SQL ILIKE - PostgreSQL only)
await service.find({ query: { name: { $ilike: '%smith%' } } })

// Not like
await service.find({ query: { email: { $notlike: '%@temp-mail.%' } } })
await service.find({ query: { name: { $notilike: '%bot%' } } })
```

### Null Handling

```typescript
// Find records where field is null
await service.find({ query: { deletedAt: { $isNull: true } } })

// Find records where field is not null
await service.find({ query: { deletedAt: { $isNull: false } } })

// Alternative syntax
await service.find({ query: { deletedAt: null } })  // IS NULL
await service.find({ query: { deletedAt: { $ne: null } } })  // IS NOT NULL
```

### Logical Operators

```typescript
// OR conditions
await service.find({
  query: {
    $or: [
      { status: 'active' },
      { role: 'admin' }
    ]
  }
})

// AND conditions (explicit)
await service.find({
  query: {
    $and: [
      { age: { $gte: 18 } },
      { age: { $lt: 65 } }
    ]
  }
})

// Complex nested conditions
await service.find({
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
await service.find({
  query: {
    $sort: { 
      createdAt: -1,  // Descending
      name: 1         // Ascending
    }
  }
})

// Pagination
await service.find({
  query: {
    $limit: 20,
    $skip: 40,  // Page 3 with 20 items per page
    $sort: { createdAt: -1 }
  }
})

// Field selection
await service.find({
  query: {
    $select: ['id', 'name', 'email', 'createdAt']
  }
})
```

## Advanced Features

### Transactions

```typescript
// Manual transaction
const trx = await db.transaction()
try {
  const userService = new KnexService({
    Model: trx,  // Use transaction instead of db
    name: 'users'
  })
  
  const user = await userService.create({ name: 'Alice' })
  await userService.patch(user.id, { verified: true })
  
  await trx.commit()
} catch (error) {
  await trx.rollback()
  throw error
}

// Automatic transaction wrapper
await db.transaction(async (trx) => {
  const userService = new KnexService({ Model: trx, name: 'users' })
  const postService = new KnexService({ Model: trx, name: 'posts' })
  
  const user = await userService.create({ name: 'Bob' })
  await postService.create({ 
    userId: user.id, 
    title: 'First Post' 
  })
  // Auto-commits on success, auto-rollbacks on error
})
```

### Raw Queries

```typescript
// Access underlying Knex query builder
const query = service.createQuery({ query: { status: 'active' } })
const results = await query
  .join('profiles', 'users.id', 'profiles.userId')
  .select('users.*', 'profiles.bio')

// Raw SQL with bindings
const results = await db.raw(
  'SELECT * FROM users WHERE age > ? AND status = ?',
  [18, 'active']
)
```

### Bulk Operations with Safety

```typescript
// Require explicit confirmation for dangerous operations
try {
  await service.patchMany(
    { status: 'archived' },
    { query: {} }  // No query = update all
  )
} catch (error) {
  // Error: "No query provided and allowAll is not set"
}

// Explicitly allow all
await service.patchMany(
  { status: 'archived' },
  { allowAll: true }
)

// Safe bulk operation with query
await service.removeMany({
  query: { 
    status: 'deleted',
    deletedAt: { $lt: thirtyDaysAgo }
  }
})
```

### Database-Specific Features

```typescript
// PostgreSQL: Case-insensitive search with ILIKE
await service.find({
  query: {
    name: { $ilike: '%smith%' }  // Native PostgreSQL ILIKE
  }
})

// PostgreSQL: JSONB queries
await service.find({
  query: {
    'metadata.tags': { $contains: ['featured'] },
    'settings->notifications': true
  }
})

// PostgreSQL: Array operations
const results = await db.raw(
  'SELECT * FROM posts WHERE tags && ARRAY[?]::text[]',
  ['javascript']
)

// PostgreSQL: Full-text search
const results = await db.raw(
  "SELECT * FROM posts WHERE to_tsvector('english', title || ' ' || content) @@ plainto_tsquery('english', ?)",
  ['search terms']
)

// MySQL: Full-text search
const results = await db.raw(
  'SELECT * FROM posts WHERE MATCH(title, content) AGAINST(?)',
  ['search terms']
)

// SQLite: Enable foreign keys
db.client.pool.on('createSuccess', (eventId, resource) => {
  resource.run('PRAGMA foreign_keys = ON')
})
```

## Error Handling

### Wings Interface (Null Returns)

```typescript
// No errors thrown for not found
const user = await service.get(999)
if (user === null) {
  // Handle not found case
}

// Validation errors
try {
  await service.patch(null as any, { name: 'Test' })
} catch (error) {
  // BadRequest: patch() requires a non-null id
}

// Database errors are wrapped
try {
  await service.create({ email: 'duplicate@example.com' })
} catch (error) {
  // GeneralError with database error details
}
```

### FeathersJS Interface (Error Throwing)

```typescript
import { NotFound, BadRequest, GeneralError } from '@feathersjs/errors'

try {
  await feathersService.get(999)
} catch (error) {
  if (error instanceof NotFound) {
    console.log('User not found')
  }
}

// Unique constraint violations
try {
  await feathersService.create({ 
    email: 'existing@example.com' 
  })
} catch (error) {
  if (error instanceof GeneralError) {
    // Check error.data for database-specific details
    if (error.data?.code === '23505') {  // PostgreSQL
      console.log('Email already exists')
    }
  }
}
```

### Database-Specific Error Handling

The adapter includes comprehensive error mapping for different databases:

```typescript
// PostgreSQL errors (using SQLSTATE codes)
- '23505': Unique constraint violation
- '23503': Foreign key violation
- '23502': Not null violation
- '22001': String data too long

// MySQL errors
- 1062: Duplicate entry
- 1452: Foreign key constraint fails
- 1048: Column cannot be null

// SQLite errors
- 'SQLITE_CONSTRAINT_UNIQUE': Unique constraint failed
- 'SQLITE_CONSTRAINT_FOREIGNKEY': Foreign key constraint failed
```

## Migration Guide

### From @feathersjs/knex

```typescript
// Before
import service from '@feathersjs/knex'
const users = service({
  Model: db,
  name: 'users',
  paginate: {
    default: 10,
    max: 50
  }
})

// After (FeathersJS compatibility)
import { FeathersKnexService } from '@wingshq/knex/feathers'
const users = new FeathersKnexService({
  Model: db,
  name: 'users'
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
const user = await service.get(id)
if (user === null) {
  // Handle not found
}

// Bulk operations
// FeathersJS style
await service.patch(null, { archived: true }, { query })

// Wings style
await service.patchMany({ archived: true }, { query, allowAll: false })

// Update operations
// FeathersJS style
await service.update(id, fullData)

// Wings style (no separate update method)
await service.patch(id, fullData)
```

## TypeScript Support

### Type-Safe Services

```typescript
interface User {
  id: number
  email: string
  name: string
  role: 'user' | 'admin'
  createdAt: Date
  updatedAt: Date
}

const users = new KnexService<User>({
  Model: db,
  name: 'users'
})

// TypeScript enforces correct types
await users.create({
  email: 'test@example.com',
  name: 'Test User',
  role: 'user',
  createdAt: new Date(),
  updatedAt: new Date()
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
  uuid: string
  title: string
  content: string
}

const docs = new KnexService<Document>({
  Model: db,
  name: 'documents',
  id: 'uuid'
})

// ID type is inferred as string
const doc = await docs.get('550e8400-e29b-41d4-a716-446655440000') // ✅ Correct
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

// Return type inference
const allUsers = await users.find()  // Type: User[]
const paginated = await users.find({ paginate: true })  // Type: Paginated<User>
```

## Testing

The knex adapter is tested against multiple databases:

- **SQLite**: Default for fast in-memory testing
- **PostgreSQL**: Full SQL database testing with advanced features
- **MySQL**: Additional SQL dialect support

### Running Tests

```bash
# Test with SQLite (default)
npm test

# Test with PostgreSQL
TEST_DB=postgres npm test

# Start PostgreSQL locally (requires Docker)
docker-compose up -d postgres
```

### Local PostgreSQL Setup

For local development and testing:

```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: feathers
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "15432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### In-Memory SQLite

```typescript
import { KnexService } from '@wingshq/knex'
import knex from 'knex'
import { beforeEach, describe, it, expect } from 'vitest'

describe('UserService', () => {
  let db: Knex
  let userService: UserService
  
  beforeEach(async () => {
    // Fresh in-memory database for each test
    db = knex({
      client: 'sqlite3',
      connection: ':memory:',
      useNullAsDefault: true
    })
    
    // Create schema
    await db.schema.createTable('users', (table) => {
      table.increments('id')
      table.string('email').unique()
      table.string('name')
      table.timestamps(true, true)
    })
    
    userService = new UserService(
      new KnexService({ Model: db, name: 'users' })
    )
  })
  
  afterEach(async () => {
    await db.destroy()
  })
  
  it('should enforce unique emails', async () => {
    await userService.create({ 
      email: 'test@example.com', 
      name: 'Test' 
    })
    
    await expect(
      userService.create({ 
        email: 'test@example.com', 
        name: 'Duplicate' 
      })
    ).rejects.toThrow()
  })
})
```

### PostgreSQL Testing

```typescript
describe('UserService with PostgreSQL', () => {
  let db: Knex
  let userService: UserService
  
  beforeEach(async () => {
    // Connect to PostgreSQL test database
    db = knex({
      client: 'pg',
      connection: {
        host: 'localhost',
        port: 15432,
        database: 'feathers_test',
        user: 'postgres',
        password: 'postgres'
      }
    })
    
    // Create schema with PostgreSQL-specific features
    await db.schema.dropTableIfExists('users')
    await db.schema.createTable('users', (table) => {
      table.increments('id')
      table.string('email').unique()
      table.string('name')
      table.jsonb('metadata')
      table.specificType('tags', 'text[]')
      table.timestamps(true, true)
    })
    
    userService = new UserService(
      new KnexService({ Model: db, name: 'users' })
    )
  })
  
  afterEach(async () => {
    await db.destroy()
  })
  
  it('should support JSONB queries', async () => {
    await userService.create({ 
      email: 'test@example.com',
      name: 'Test User',
      metadata: { role: 'admin', verified: true }
    })
    
    const admins = await userService.find({
      query: {
        'metadata->role': 'admin'
      }
    })
    
    expect(admins).toHaveLength(1)
  })
})
```

### Test Transactions

```typescript
it('should rollback on error', async () => {
  const trx = await db.transaction()
  const service = new KnexService({ Model: trx, name: 'users' })
  
  try {
    await service.create({ name: 'Test User' })
    throw new Error('Simulated error')
  } catch (error) {
    await trx.rollback()
  }
  
  // Verify nothing was saved
  const count = await db('users').count('* as count')
  expect(count[0].count).toBe(0)
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

# Test specific database
TEST_DB=postgres npm test
TEST_DB=mysql npm test
TEST_DB=sqlite npm test
```

## Contributing

See the [main contributing guide](https://github.com/wingshq/wings/blob/main/CONTRIBUTING.md) for details on how to contribute to this project.

## License

[MIT](https://github.com/wingshq/wings/blob/main/LICENSE)