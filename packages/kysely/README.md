# @wingshq/kysely

[![CI](https://github.com/wingshq/wings/workflows/CI/badge.svg)](https://github.com/wingshq/wings/actions?query=workflow%3ACI)
[![npm version](https://img.shields.io/npm/v/@wingshq/kysely.svg)](https://www.npmjs.com/package/@wingshq/kysely)
[![Downloads](https://img.shields.io/npm/dm/@wingshq/kysely.svg)](https://www.npmjs.com/package/@wingshq/kysely)
[![License](https://img.shields.io/npm/l/@wingshq/kysely.svg)](https://github.com/wingshq/wings/blob/main/LICENSE)

A high-performance SQL query builder adapter for Wings and FeathersJS applications, built on [Kysely](https://kysely.dev/) - a type-safe SQL query builder for TypeScript.

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

The kysely adapter provides a modern SQL database adapter with support for:

- ✅ **Full Wings Interface**: Modern API with null-safe returns and explicit bulk operations
- ✅ **FeathersJS Compatibility**: Drop-in replacement for existing FeathersJS applications
- ✅ **Type-Safe SQL**: Kysely's type-safe query builder ensures compile-time SQL validation
- ✅ **Multiple Databases**: PostgreSQL, MySQL, SQLite, MSSQL, and more via Kysely dialects
- ✅ **Rich Query Syntax**: Including `$like`, `$ilike`, `$isNull`, and all standard operators
- ✅ **Advanced SQL Features**: Transactions, joins, CTEs, window functions, and raw SQL
- ✅ **TypeScript First**: Full TypeScript support with automatic type inference
- ✅ **Performance**: Optimized query building with minimal overhead

## Installation

```bash
npm install @wingshq/kysely kysely
```

```bash
yarn add @wingshq/kysely kysely
```

```bash
pnpm add @wingshq/kysely kysely
```

You'll also need to install the appropriate database driver and dialect:

```bash
# PostgreSQL
npm install pg

# MySQL
npm install mysql2

# SQLite
npm install better-sqlite3

# MSSQL
npm install tedious tarn @tediousjs/connection-string
```

## Quick Start

### Wings Interface

```typescript
import { KyselyAdapter } from '@wingshq/kysely'
import { Kysely, PostgresDialect } from 'kysely'
import { Pool } from 'pg'

// Define your database schema
interface Database {
  users: {
    id: number
    name: string
    email: string
    age: number
    createdAt: Date
  }
}

// Create Kysely instance
// Option 1: PostgreSQL
const db = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool: new Pool({
      host: 'localhost',
      port: 5432,
      database: 'myapp',
      user: 'postgres',
      password: 'postgres'
    })
  })
})

// Option 2: SQLite
// const db = new Kysely<Database>({
//   dialect: new SqliteDialect({
//     database: new Database('./myapp.db')
//   })
// })

// Create adapter instance
const users = new KyselyAdapter<Database['users']>({
  Model: db,
  table: 'users',
  id: 'id',
  dialect: 'postgres'
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
import { FeathersKyselyAdapter } from '@wingshq/kysely/feathers'
import { Kysely, SqliteDialect } from 'kysely'
import Database from 'better-sqlite3'

// Drop-in replacement for FeathersJS adapters
const db = new Kysely<Database>({
  dialect: new SqliteDialect({
    database: new Database('./myapp.db')
  })
})

const users = new FeathersKyselyAdapter({
  Model: db,
  table: 'users',
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
interface KyselyOptions {
  Model: Kysely<any>         // Kysely database instance
  table: string              // Table name
  id?: string                // Primary key field (default: 'id')
  dialect?: 'sqlite' | 'postgres' | 'mysql'  // SQL dialect
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
    age: { $gte: 18 },
    email: { $like: '%@company.com' },
    $or: [
      { status: 'active' },
      { role: 'admin' }
    ],
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

// Kysely returns created records with auto-generated fields
const user = await service.create({
  name: 'Dave'
  // id and createdAt will be included in response
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
import { FeathersKyselyAdapter } from '@wingshq/kysely/feathers'

const service = new FeathersKyselyAdapter<User>({
  Model: db,
  table: 'users'
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

#### Database Setup

```typescript
// PostgreSQL - Standard connection
import { PostgresDialect } from 'kysely'
import { Pool } from 'pg'

const db = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool: new Pool({
      host: 'localhost',
      port: 5432,
      database: 'myapp',
      user: 'postgres',
      password: 'postgres',
      max: 10
    })
  })
})

// PostgreSQL - Connection string
const db = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool: new Pool({
      connectionString: 'postgresql://user:password@localhost:5432/myapp'
    })
  })
})

// PostgreSQL - Environment variable
const db = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool: new Pool({
      connectionString: process.env.DATABASE_URL
    })
  })
})

// PostgreSQL with SSL (AWS RDS, Heroku, etc.)
const db = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool: new Pool({
      host: 'your-database.amazonaws.com',
      port: 5432,
      database: 'myapp',
      user: 'dbuser',
      password: 'dbpass',
      ssl: {
        rejectUnauthorized: false
      }
    })
  })
})

// MySQL
import { MysqlDialect } from 'kysely'
import { createPool } from 'mysql2'

const db = new Kysely<Database>({
  dialect: new MysqlDialect({
    pool: createPool({
      host: 'localhost',
      port: 3306,
      database: 'myapp',
      user: 'root',
      password: 'password',
      charset: 'utf8mb4'
    })
  })
})

// SQLite - File-based
import { SqliteDialect } from 'kysely'
import Database from 'better-sqlite3'

const db = new Kysely<Database>({
  dialect: new SqliteDialect({
    database: new Database('./myapp.db')
  })
})

// SQLite - In-memory (great for testing)
const db = new Kysely<Database>({
  dialect: new SqliteDialect({
    database: new Database(':memory:')
  })
})
```

#### Type-Safe Schema

```typescript
// Define your database schema
interface Database {
  users: UserTable
  posts: PostTable
  comments: CommentTable
}

interface UserTable {
  id: Generated<number>
  email: string
  name: string
  role: 'user' | 'admin'
  createdAt: Generated<Date>
  updatedAt: Generated<Date>
}

// Create type-safe adapters
const users = new KyselyAdapter<UserTable>({
  Model: db,
  table: 'users'
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
// Standard operators
await service.find({ query: { age: { $gt: 21 } } })
await service.find({ query: { age: { $gte: 21 } } })
await service.find({ query: { price: { $lt: 100 } } })
await service.find({ query: { price: { $lte: 100 } } })
await service.find({ query: { status: { $ne: 'deleted' } } })

// In / Not in
await service.find({ query: { role: { $in: ['admin', 'moderator'] } } })
await service.find({ query: { status: { $nin: ['deleted', 'banned'] } } })
```

### Text Search Operators

```typescript
// Case-sensitive pattern matching (SQL LIKE)
await service.find({ query: { email: { $like: '%@gmail.com' } } })
await service.find({ query: { name: { $like: 'John%' } } })

// Case-insensitive pattern matching (PostgreSQL ILIKE)
await service.find({ query: { name: { $ilike: '%smith%' } } })

// Not like
await service.find({ query: { email: { $notlike: '%@temp-mail.%' } } })
```

### Null Handling

```typescript
// Find records where field is null
await service.find({ query: { deletedAt: { $isNull: true } } })

// Find records where field is not null
await service.find({ query: { deletedAt: { $isNull: false } } })

// Direct null comparison
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
          { verified: true }
        ]
      },
      { role: 'admin' }
    ]
  }
})
```

## Advanced Features

### PostgreSQL-Specific Features

The adapter fully supports PostgreSQL's advanced features:

```typescript
// Case-insensitive search with ILIKE
const results = await service.find({
  query: {
    name: { $ilike: '%smith%' }  // Native PostgreSQL ILIKE
  }
})

// Using Kysely for PostgreSQL arrays
const db = service.Model
const posts = await db
  .selectFrom('posts')
  .where('tags', '@>', ['javascript', 'typescript'])
  .execute()

// JSONB queries with Kysely
interface UserTable {
  id: Generated<number>
  email: string
  metadata: {
    role: string
    preferences: {
      theme: string
      notifications: boolean
    }
  }
}

const admins = await db
  .selectFrom('users')
  .where('metadata', '->', 'role', '=', 'admin')
  .execute()

// Full-text search
const results = await db
  .selectFrom('posts')
  .whereRaw("to_tsvector('english', title || ' ' || content) @@ plainto_tsquery('english', ?)", ['search terms'])
  .execute()

// Window functions
const ranked = await db
  .selectFrom('scores')
  .select([
    'player_name',
    'score',
    db.fn
      .rank()
      .over(ob => ob.orderBy('score', 'desc'))
      .as('rank')
  ])
  .execute()
```

### Transactions

```typescript
// Use transactions for data consistency
await db.transaction().execute(async (trx) => {
  const userService = new KyselyAdapter({
    Model: db,
    table: 'users'
  })
  
  const orderService = new KyselyAdapter({
    Model: db,
    table: 'orders'
  })

  // All operations use the same transaction
  const user = await userService.create(
    { name: 'Alice', balance: 1000 },
    { transaction: trx }
  )
  
  const order = await orderService.create(
    { userId: user.id, amount: 100 },
    { transaction: trx }
  )
  
  await userService.patch(
    user.id,
    { balance: user.balance - order.amount },
    { transaction: trx }
  )
})
```

### Raw Kysely Queries

```typescript
// Access the underlying Kysely instance for complex queries
const db = service.Model

// Complex join query
const results = await db
  .selectFrom('users')
  .leftJoin('posts', 'posts.userId', 'users.id')
  .select([
    'users.id',
    'users.name',
    db.fn.count('posts.id').as('postCount')
  ])
  .groupBy('users.id')
  .having('postCount', '>', 5)
  .execute()

// Window functions
const ranked = await db
  .selectFrom('users')
  .select([
    'name',
    'score',
    db.fn
      .rank()
      .over(ob => ob.orderBy('score', 'desc'))
      .as('rank')
  ])
  .execute()
```

### Type-Safe Query Building

```typescript
// Kysely provides compile-time validation
interface UserTable {
  id: Generated<number>
  email: string
  name: string
  age: number
}

const service = new KyselyAdapter<UserTable>({
  Model: db,
  table: 'users'
})

// TypeScript will catch invalid field names
await service.find({
  query: {
    invalidField: 'test' // ❌ Compile error
  }
})

// Type-safe operators
await service.find({
  query: {
    age: { $gt: '18' } // ❌ Compile error - must be number
  }
})
```

### Migration Support

```typescript
// Use Kysely's migration system
import { Migrator, FileMigrationProvider } from 'kysely'
import path from 'path'
import { promises as fs } from 'fs'

const migrator = new Migrator({
  db,
  provider: new FileMigrationProvider({
    fs,
    path,
    migrationFolder: path.join(__dirname, 'migrations')
  })
})

// Run migrations
const { error, results } = await migrator.migrateToLatest()
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

// Database errors
try {
  await service.create({ email: 'duplicate@example.com' })
} catch (error) {
  // Database constraint violations are thrown
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

// Constraint violations
try {
  await feathersService.create({ 
    email: 'existing@example.com' 
  })
} catch (error) {
  if (error instanceof GeneralError) {
    // Check database-specific error codes
  }
}
```

## Migration Guide

### From @feathersjs/knex

```typescript
// Before (Knex)
import { KnexService } from '@feathersjs/knex'
const users = new KnexService({
  Model: knex,
  name: 'users'
})

// After (Kysely)
import { FeathersKyselyAdapter } from '@wingshq/kysely/feathers'
const users = new FeathersKyselyAdapter({
  Model: kyselyDb,
  table: 'users'
})
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
```

## TypeScript Support

The adapter leverages Kysely's excellent TypeScript support:

```typescript
// Define your schema with Generated types
import { Generated } from 'kysely'

interface UserTable {
  id: Generated<number>
  email: string
  name: string
  role: 'user' | 'admin'
  createdAt: Generated<Date>
  updatedAt: Generated<Date>
}

// Full type inference
const users = new KyselyAdapter<UserTable>({
  Model: db,
  table: 'users'
})

// Return types are inferred
const user = await users.get(1) // Type: UserTable | null
const allUsers = await users.find() // Type: UserTable[]
```

## MySQL Support

The Kysely adapter fully supports MySQL with automatic handling of MySQL-specific limitations:

- **RETURNING clause**: MySQL doesn't support RETURNING, so the adapter automatically fetches records after insert/update/delete operations
- **Auto-increment IDs**: Full support for auto-increment primary keys
- **LIMIT syntax**: Automatically uses MySQL's maximum BIGINT value instead of -1 for unlimited queries
- **Case-insensitive LIKE**: `$ilike` operator is emulated using `LOWER()` functions

```typescript
// MySQL configuration
const db = new Kysely<Database>({
  dialect: new MysqlDialect({
    pool: mysql.createPool({
      host: 'localhost',
      port: 3306,
      database: 'myapp',
      user: 'root',
      password: 'password'
    })
  })
})

// Create adapter with MySQL dialect
const adapter = new KyselyAdapter({
  Model: db,
  table: 'users',
  dialect: 'mysql'  // Important for MySQL-specific handling
})

// Works seamlessly with auto-increment
const user = await adapter.create({ name: 'John' }) // ✅ Returns full record with ID
```

## Testing

The kysely adapter is tested against multiple databases:

- **SQLite**: Default for fast in-memory testing
- **PostgreSQL**: Full SQL database testing with advanced features
- **MySQL**: Full MySQL 8.0 support with all features

### Running Tests

```bash
# Test with SQLite (default)
npm test

# Test with PostgreSQL
TEST_DB=postgres npm test

# Test with MySQL
TEST_DB=mysql npm test

# Start databases locally (requires Docker)
docker-compose up -d postgres mysql
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

### Unit Testing

```typescript
import { describe, it, expect } from 'vitest'
import { Kysely, SqliteDialect } from 'kysely'
import Database from 'better-sqlite3'
import { KyselyAdapter } from '@wingshq/kysely'

describe('UserService', () => {
  let db: Kysely<Database>
  let service: KyselyAdapter<User>
  
  beforeEach(async () => {
    // In-memory database for testing
    db = new Kysely<Database>({
      dialect: new SqliteDialect({
        database: new Database(':memory:')
      })
    })
    
    // Create schema
    await db.schema
      .createTable('users')
      .addColumn('id', 'integer', col => col.primaryKey().autoIncrement())
      .addColumn('email', 'text', col => col.notNull().unique())
      .addColumn('name', 'text', col => col.notNull())
      .execute()
    
    service = new KyselyAdapter<User>({
      Model: db,
      table: 'users'
    })
  })
  
  afterEach(async () => {
    await db.destroy()
  })
  
  it('should create a user', async () => {
    const user = await service.create({
      email: 'test@example.com',
      name: 'Test User'
    })
    
    expect(user.id).toBeDefined()
    expect(user.email).toBe('test@example.com')
  })
})
```

### PostgreSQL Testing

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Kysely, PostgresDialect } from 'kysely'
import { Pool } from 'pg'
import { KyselyAdapter } from '@wingshq/kysely'

describe('UserService with PostgreSQL', () => {
  let db: Kysely<Database>
  let service: KyselyAdapter<User>
  
  beforeEach(async () => {
    // Connect to PostgreSQL test database
    db = new Kysely<Database>({
      dialect: new PostgresDialect({
        pool: new Pool({
          host: 'localhost',
          port: 15432,
          database: 'feathers_test',
          user: 'postgres',
          password: 'postgres'
        })
      })
    })
    
    // Create schema with PostgreSQL-specific features
    await db.schema
      .dropTable('users')
      .ifExists()
      .execute()
      
    await db.schema
      .createTable('users')
      .addColumn('id', 'serial', col => col.primaryKey())
      .addColumn('email', 'text', col => col.notNull().unique())
      .addColumn('name', 'text', col => col.notNull())
      .addColumn('metadata', 'jsonb')
      .addColumn('tags', 'text[]')
      .addColumn('createdAt', 'timestamp', col => col.defaultTo(sql`now()`))
      .execute()
    
    service = new KyselyAdapter<User>({
      Model: db,
      table: 'users',
      dialect: 'postgres'
    })
  })
  
  afterEach(async () => {
    await db.destroy()
  })
  
  it('should support JSONB queries', async () => {
    await service.create({ 
      email: 'test@example.com',
      name: 'Test User',
      metadata: { role: 'admin', verified: true }
    })
    
    const results = await db
      .selectFrom('users')
      .where('metadata', '->', 'role', '=', 'admin')
      .execute()
    
    expect(results).toHaveLength(1)
  })
  
  it('should support case-insensitive search', async () => {
    await service.create({ 
      email: 'john.smith@example.com',
      name: 'John Smith'
    })
    
    const results = await service.find({
      query: { name: { $ilike: '%SMITH%' } }
    })
    
    expect(results).toHaveLength(1)
  })
})
```

### Running Tests

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