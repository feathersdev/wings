# @wingshq/db0

[![CI](https://github.com/wingshq/wings/workflows/CI/badge.svg)](https://github.com/wingshq/wings/actions?query=workflow%3ACI)
[![npm version](https://img.shields.io/npm/v/@wingshq/db0.svg)](https://www.npmjs.com/package/@wingshq/db0)
[![Downloads](https://img.shields.io/npm/dm/@wingshq/db0.svg)](https://www.npmjs.com/package/@wingshq/db0)
[![License](https://img.shields.io/npm/l/@wingshq/db0.svg)](https://github.com/wingshq/wings/blob/main/LICENSE)

A modern, edge-ready SQL database adapter for Wings and FeathersJS applications, built on [db0](https://db0.unjs.io/). Provides universal database connectivity with special support for Cloudflare Workers and Durable Objects.

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

The db0 adapter provides a modern database adapter with support for:

- ✅ **Full Wings Interface**: Modern API with null-safe returns and explicit bulk operations
- ✅ **FeathersJS Compatibility**: Drop-in replacement for existing FeathersJS applications
- ✅ **Edge Runtime Support**: Works in Cloudflare Workers, Vercel Edge, and other edge environments
- ✅ **Universal Database API**: Support for SQLite, PostgreSQL, MySQL via db0
- ✅ **Cloudflare Durable Objects**: Native SQL storage in Durable Objects
- ✅ **Rich Query Syntax**: Including `$like`, `$ilike`, `$isNull`, and all standard operators
- ✅ **TypeScript First**: Full TypeScript support with generics
- ✅ **Lightweight**: Minimal dependencies, optimized for edge deployments

## Installation

```bash
npm install @wingshq/db0 db0
```

```bash
yarn add @wingshq/db0 db0
```

```bash
pnpm add @wingshq/db0 db0
```

You'll also need to install the appropriate database connector:

```bash
# For SQLite
npm install better-sqlite3

# For PostgreSQL
npm install pg

# For MySQL
npm install mysql2

# For PostgreSQL (via Cloudflare Workers)
npm install @cloudflare/workers-types

# For LibSQL/Turso
npm install @libsql/client

# For PlanetScale
npm install @planetscale/database
```

## Quick Start

### Wings Interface

```typescript
import { Db0Service } from '@wingshq/db0'
import { createDatabase } from 'db0'
import sqlite from 'db0/connectors/better-sqlite3'

interface User {
  id: number
  name: string
  email: string
  role: string
  createdAt: string
}

// Create database connection
// Option 1: SQLite
const db = createDatabase(
  sqlite({
    name: 'myapp.db'
  })
)

// Option 2: PostgreSQL
// import postgres from 'db0/connectors/postgresql'
// const db = createDatabase(
//   postgres({
//     host: 'localhost',
//     port: 5432,
//     database: 'myapp',
//     user: 'postgres',
//     password: 'postgres'
//   })
// )

// Create service instance
const users = new Db0Service<User>({
  db,
  table: 'users',
  idField: 'id',
  dialect: 'sqlite'  // or 'postgres' for PostgreSQL, 'mysql' for MySQL
})

// Create a user
const user = await users.create({
  name: 'Alice Johnson',
  email: 'alice@example.com',
  role: 'admin',
  createdAt: new Date().toISOString()
})

// Find users with pagination
const result = await users.find({
  query: {
    role: 'admin',
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
import { FeathersDb0Service } from '@wingshq/db0/feathers'
import { createDatabase } from 'db0'
import sqlite from 'db0/connectors/better-sqlite3'

// Drop-in replacement for SQL FeathersJS adapters
const db = createDatabase(
  sqlite({
    name: 'myapp.db'
  })
)

const users = new FeathersDb0Service({
  db,
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

### Cloudflare Workers & Durable Objects

```typescript
import { Db0Service } from '@wingshq/db0'
import { createDatabase } from 'db0'
import durableObjectSql from '@wingshq/db0/cloudflare'

export class UserDurableObject implements DurableObject {
  private service: Db0Service<User>

  constructor(state: DurableObjectState) {
    const db = createDatabase(
      durableObjectSql({ sql: state.storage.sql })
    )
    
    this.service = new Db0Service<User>({
      db,
      table: 'users',
      dialect: 'sqlite'
    })
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    
    if (url.pathname === '/users' && request.method === 'GET') {
      const users = await this.service.find()
      return Response.json(users)
    }
    
    if (url.pathname === '/users' && request.method === 'POST') {
      const data = await request.json()
      const user = await this.service.create(data)
      return Response.json(user)
    }
    
    return new Response('Not Found', { status: 404 })
  }
}
```

## API Documentation

### Wings Interface

The Wings interface provides a modern, type-safe API with explicit operations:

#### Constructor Options

```typescript
interface Db0ServiceOptions {
  db: Database             // db0 database instance
  table: string           // Table name
  idField?: string        // Primary key field (default: 'id')
  dialect?: SqlDialect    // 'sqlite' | 'postgres' | 'mysql'
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

// With RETURNING clause (gets created records)
const user = await service.create({
  name: 'Dave',
  email: 'dave@example.com'
})
console.log(user.id) // Auto-generated ID
```

##### patch()

```typescript
// Patch single record (returns null if not found)
const updated = await service.patch(123, {
  status: 'active',
  lastLogin: new Date().toISOString()
})

// Bulk patch with patchMany
const updated = await service.patchMany(
  { status: 'archived' },
  { 
    query: { 
      lastLogin: { $lt: thirtyDaysAgo.toISOString() } 
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
    deletedAt: { $lt: sevenDaysAgo.toISOString() }
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
import { FeathersDb0Service } from '@wingshq/db0/feathers'

const service = new FeathersDb0Service<User>({
  db,
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
  role: 'user'
})

// Bulk operations (FeathersJS style)
await service.patch(null, { archived: true }, {
  query: { status: 'inactive' }
})
```

### Configuration Options

#### Database Connections

```typescript
// SQLite (local)
import sqlite from 'db0/connectors/better-sqlite3'
const db = createDatabase(
  sqlite({
    name: ':memory:' // or 'path/to/database.db'
  })
)

// PostgreSQL
import postgres from 'db0/connectors/postgresql'
const db = createDatabase(
  postgres({
    host: 'localhost',
    port: 5432,
    database: 'myapp',
    user: 'postgres',
    password: 'postgres'
  })
)

// MySQL
import mysql from 'db0/connectors/mysql2'
const db = createDatabase(
  mysql({
    host: 'localhost',
    port: 3306,
    database: 'myapp',
    user: 'root',
    password: 'password'
  })
)

// LibSQL/Turso (edge-ready SQLite)
import libsql from 'db0/connectors/libsql'
const db = createDatabase(
  libsql({
    url: 'libsql://your-database.turso.io',
    authToken: 'your-auth-token'
  })
)

// PlanetScale (serverless MySQL)
import planetscale from 'db0/connectors/planetscale'
const db = createDatabase(
  planetscale({
    url: process.env.DATABASE_URL
  })
)

// Cloudflare D1
import d1 from 'db0/connectors/cloudflare-d1'
const db = createDatabase(
  d1(env.DB) // env.DB is your D1 database binding
)
```

#### Custom Configuration

```typescript
const service = new Db0Service({
  db,
  table: 'users',
  idField: 'uuid',        // Custom primary key
  dialect: 'postgres'     // SQL dialect for proper quoting ('sqlite', 'postgres', or 'mysql')
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
```

### Text Search Operators

```typescript
// Case-sensitive pattern matching (SQL LIKE)
await service.find({ query: { email: { $like: '%@gmail.com' } } })
await service.find({ query: { name: { $like: 'John%' } } })

// Case-insensitive pattern matching
// PostgreSQL: Uses native ILIKE
// MySQL/SQLite: Falls back to LOWER() comparison
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

### MySQL Support

The db0 adapter provides full MySQL support with automatic handling of MySQL limitations:

```typescript
import { Db0Service } from '@wingshq/db0'
import { createDatabase } from 'db0'
import mysql from 'db0/connectors/mysql2'

// Standard MySQL connection
const db = createDatabase(
  mysql({
    host: 'localhost',
    port: 3306,
    database: 'myapp',
    user: 'root',
    password: 'password'
  })
)

// Create service with MySQL dialect
const users = new Db0Service<User>({
  db,
  table: 'users',
  dialect: 'mysql' // Important for MySQL-specific behavior
})

// Connection URL format
const db = createDatabase(
  mysql({
    uri: 'mysql://user:password@localhost:3306/myapp'
  })
)

// Connection pooling
const db = createDatabase(
  mysql({
    host: 'localhost',
    port: 3306,
    database: 'myapp',
    user: 'root',
    password: 'password',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  })
)
```

#### MySQL-Specific Behavior

The adapter automatically handles MySQL limitations:

- **No RETURNING clause**: The adapter uses INSERT/UPDATE then SELECT pattern
- **No LIMIT -1**: Uses MySQL's max BIGINT value for unlimited results
- **Identifier quoting**: Uses backticks instead of double quotes
- **Case-insensitive LIKE**: Uses `LOWER()` for `$ilike` operations

```typescript
// These operations work seamlessly despite MySQL limitations
const user = await users.create({
  name: 'John Doe',
  email: 'john@example.com'
})
console.log(user.id) // Auto-generated ID retrieved after insert

// Bulk operations also work correctly
const updated = await users.patchMany(
  { status: 'active' },
  { query: { role: 'user' } }
)
console.log(updated) // All updated records retrieved
```

### PostgreSQL Support

The db0 adapter provides full PostgreSQL support with automatic dialect detection:

```typescript
import { Db0Service } from '@wingshq/db0'
import { createDatabase } from 'db0'
import postgres from 'db0/connectors/postgresql'

// Standard PostgreSQL connection
const db = createDatabase(
  postgres({
    host: 'localhost',
    port: 5432,
    database: 'myapp',
    user: 'postgres',
    password: 'postgres'
  })
)

// Create service with PostgreSQL dialect
const users = new Db0Service<User>({
  db,
  table: 'users',
  dialect: 'postgres' // Important for proper SQL generation
})

// Connection string format
const db = createDatabase(
  postgres({
    connectionString: 'postgresql://user:password@localhost:5432/myapp'
  })
)

// SSL connection
const db = createDatabase(
  postgres({
    host: 'your-database.amazonaws.com',
    port: 5432,
    database: 'myapp',
    user: 'postgres',
    password: 'postgres',
    ssl: {
      rejectUnauthorized: false
    }
  })
)

// Connection pooling
const db = createDatabase(
  postgres({
    host: 'localhost',
    port: 5432,
    database: 'myapp',
    user: 'postgres',
    password: 'postgres',
    max: 20, // Maximum pool size
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000
  })
)
```

#### PostgreSQL-Specific Features

```typescript
// Case-insensitive search with ILIKE
const results = await users.find({
  query: {
    name: { $ilike: '%smith%' } // Native ILIKE support
  }
})

// Advanced text search
const results = await users.find({
  query: {
    $or: [
      { email: { $like: '%@company.com' } },
      { name: { $ilike: 'john%' } }
    ]
  }
})

// Working with PostgreSQL arrays (requires raw SQL)
const tags = await db.prepare(
  'SELECT * FROM posts WHERE tags && ARRAY[?]::text[]'
).all(['javascript'])

// JSON/JSONB columns (requires raw SQL)
const results = await db.prepare(
  "SELECT * FROM users WHERE metadata->>'role' = ?"
).all('admin')
```

### Edge Runtime Compatibility

```typescript
// Works in Cloudflare Workers
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const db = createDatabase(d1(env.DB))
    const service = new Db0Service({
      db,
      table: 'users',
      dialect: 'sqlite'
    })
    
    const users = await service.find()
    return Response.json(users)
  }
}

// Works in Vercel Edge Functions
export const config = { runtime: 'edge' }

export default async function handler(request: Request) {
  const db = createDatabase(/* your connector */)
  const service = new Db0Service({
    db,
    table: 'products'
  })
  
  const products = await service.find()
  return Response.json(products)
}
```

### Cloudflare Durable Objects

```typescript
import durableObjectSql from '@wingshq/db0/cloudflare'

export class StatefulService implements DurableObject {
  private db: Database
  private users: Db0Service<User>
  private sessions: Db0Service<Session>

  constructor(state: DurableObjectState) {
    // Single database for all tables
    this.db = createDatabase(
      durableObjectSql({ sql: state.storage.sql })
    )
    
    // Multiple services sharing the same database
    this.users = new Db0Service({
      db: this.db,
      table: 'users'
    })
    
    this.sessions = new Db0Service({
      db: this.db,
      table: 'sessions'
    })
    
    // Initialize schema
    this.initSchema()
  }
  
  private async initSchema() {
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        name TEXT
      );
      
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        userId INTEGER,
        expiresAt TEXT,
        FOREIGN KEY (userId) REFERENCES users(id)
      );
    `)
  }
  
  async fetch(request: Request): Promise<Response> {
    // Your API implementation
  }
}
```

### Raw SQL Access

```typescript
// Execute raw queries when needed
const results = await db.prepare(
  'SELECT u.*, COUNT(o.id) as orderCount ' +
  'FROM users u ' +
  'LEFT JOIN orders o ON u.id = o.userId ' +
  'WHERE u.createdAt > ? ' +
  'GROUP BY u.id'
).all(startDate)

// Use with service for complex operations
const service = new Db0Service({ db, table: 'users' })

// Standard operations through service
const activeUsers = await service.find({
  query: { status: 'active' }
})

// Raw SQL for complex queries
const analytics = await db.prepare(
  'SELECT DATE(createdAt) as date, COUNT(*) as signups ' +
  'FROM users ' +
  'GROUP BY DATE(createdAt) ' +
  'ORDER BY date DESC ' +
  'LIMIT 30'
).all()
```

### Bulk Operations Safety

```typescript
// Safety controls prevent accidental mass updates
try {
  await service.patchMany(
    { status: 'archived' },
    { query: {} }  // Empty query
  )
} catch (error) {
  // Error: "patchMany: No query provided. Use allowAll:true to patch all records"
}

// Explicitly allow operations on all records
await service.patchMany(
  { status: 'archived' },
  { allowAll: true }
)

// Safe bulk operation with specific query
await service.removeMany({
  query: { 
    status: 'pending',
    createdAt: { $lt: oneWeekAgo }
  }
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
  console.log(error.message)
  console.log(error.data) // Original error details
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

// Database constraint violations
try {
  await feathersService.create({ 
    email: 'existing@example.com' 
  })
} catch (error) {
  if (error instanceof GeneralError) {
    // Check for specific database errors
    const message = error.message.toLowerCase()
    if (message.includes('unique constraint')) {
      console.log('Email already exists')
    }
  }
}
```

### Database-Agnostic Error Handling

The adapter provides consistent error handling across different databases:

```typescript
// Pattern-based error detection works across SQLite, MySQL, PostgreSQL
- Unique constraint violations
- Foreign key constraint failures  
- Not null constraint violations
- Check constraint failures

// Example error handling
try {
  await service.create({ email: 'duplicate@example.com' })
} catch (error) {
  if (error.message.includes('UNIQUE constraint failed')) {
    // SQLite
  } else if (error.message.includes('Duplicate entry')) {
    // MySQL
  } else if (error.code === '23505') {
    // PostgreSQL
  }
}
```

## Migration Guide

### From Traditional SQL Adapters

```typescript
// From @feathersjs/knex or similar
const oldService = new KnexService({
  Model: db,
  name: 'users'
})

// To @wingshq/db0 (FeathersJS compatible)
import { FeathersDb0Service } from '@wingshq/db0/feathers'
const newService = new FeathersDb0Service({
  db: createDatabase(/* connector */),
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

### Schema Definition

```typescript
// Define your schema using db0
await db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    active INTEGER DEFAULT 1,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE INDEX idx_users_email ON users(email);
  CREATE INDEX idx_users_active ON users(active);
`)

// Then use with the service
const userService = new Db0Service({
  db,
  table: 'users',
  dialect: 'sqlite'
})
```

## TypeScript Support

### Type-Safe Services

```typescript
interface User {
  id: number
  email: string
  name: string
  role: 'user' | 'admin' | 'moderator'
  active: boolean
  createdAt: string
  updatedAt: string
}

const users = new Db0Service<User>({
  db,
  table: 'users'
})

// TypeScript enforces correct types
await users.create({
  email: 'test@example.com',
  name: 'Test User',
  role: 'user',
  active: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
})

// Type error: role must be 'user' | 'admin' | 'moderator'
await users.create({
  email: 'test@example.com',
  name: 'Test',
  role: 'superadmin' // ❌ Type error
})
```

### Generic Types

```typescript
// Service with custom ID type
interface Document {
  uuid: string
  title: string
  content: string
}

const docs = new Db0Service<Document>({
  db,
  table: 'documents',
  idField: 'uuid'
})

// ID type is inferred correctly
const doc = await docs.get('550e8400-e29b-41d4-a716-446655440000')
```

### Query Type Safety

```typescript
// Queries are type-checked
await users.find({
  query: {
    role: { $in: ['user', 'admin'] }, // ✅ Valid roles
    active: true,
    createdAt: { $gte: '2024-01-01' }
  }
})

// Return type inference
const allUsers = await users.find()  // Type: User[]
const paginated = await users.find({ paginate: true })  // Type: Paginated<User>
```

## Testing

The db0 adapter is tested against multiple databases to ensure compatibility:

- **SQLite**: Default for fast in-memory testing
- **PostgreSQL**: Full SQL database testing with advanced features
- **MySQL**: Complete MySQL 8+ compatibility with RETURNING clause workarounds

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

For local development and testing with PostgreSQL:

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
  
  mysql:
    image: mysql:8
    environment:
      MYSQL_ROOT_PASSWORD: mysql
      MYSQL_DATABASE: feathers
      MYSQL_USER: mysql
      MYSQL_PASSWORD: mysql
    ports:
      - "23306:3306"
    volumes:
      - mysql_data:/var/lib/mysql

volumes:
  postgres_data:
  mysql_data:
```

```bash
# Start PostgreSQL
docker-compose up -d

# Connect to PostgreSQL
psql -h localhost -p 15432 -U postgres -d feathers

# Stop PostgreSQL
docker-compose down

# Remove data volume
docker-compose down -v
```

### Unit Testing

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { createDatabase } from 'db0'
import sqlite from 'db0/connectors/better-sqlite3'
import postgres from 'db0/connectors/postgresql'
import { Db0Service } from '@wingshq/db0'

describe('UserService', () => {
  let service: Db0Service<User>
  
  beforeEach(async () => {
    // Choose database based on environment
    let db: Database
    let dialect: 'sqlite' | 'postgres' | 'mysql'
    
    switch (process.env.TEST_DB) {
      case 'postgres':
        db = createDatabase(postgres({
          host: 'localhost',
          port: 15432,
          database: 'feathers',
          user: 'postgres',
          password: 'postgres'
        }))
        dialect = 'postgres'
        break
      
      case 'mysql':
        db = createDatabase(mysql({
          host: 'localhost',
          port: 23306,
          database: 'feathers',
          user: 'mysql',
          password: 'mysql'
        }))
        dialect = 'mysql'
        break
      
      default:
        db = createDatabase(sqlite({ name: ':memory:' }))
        dialect = 'sqlite'
    }
    
    // Create schema (adjust for database type)
    if (dialect === 'postgres') {
      await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          name TEXT
        )
      `)
    } else if (dialect === 'mysql') {
      await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          name VARCHAR(255)
        )
      `)
    } else {
      await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE NOT NULL,
          name TEXT
        )
      `)
    }
    
    service = new Db0Service<User>({
      db,
      table: 'users',
      dialect
    })
  })
  
  it('should enforce unique emails', async () => {
    await service.create({ 
      email: 'test@example.com', 
      name: 'Test' 
    })
    
    await expect(
      service.create({ 
        email: 'test@example.com', 
        name: 'Duplicate' 
      })
    ).rejects.toThrow(/unique/i)
  })
})
```

### Integration Testing

```typescript
// Test with real database
const db = createDatabase(
  sqlite({ name: './test.db' })
)

// Test with edge runtime
import { unstable_dev } from 'wrangler'

const worker = await unstable_dev('src/index.ts', {
  experimental: { disableExperimentalWarning: true }
})

const response = await worker.fetch('/api/users')
const users = await response.json()
```

### Running Package Tests

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm test -- --coverage

# Test Cloudflare Worker locally
npm run cf:dev

# Deploy test worker
npm run cf:deploy
```

## Contributing

See the [main contributing guide](https://github.com/wingshq/wings/blob/main/CONTRIBUTING.md) for details on how to contribute to this project.

## License

[MIT](https://github.com/wingshq/wings/blob/main/LICENSE)