# @wingshq/mongodb

[![CI](https://github.com/wingshq/wings/workflows/CI/badge.svg)](https://github.com/wingshq/wings/actions?query=workflow%3ACI)
[![npm version](https://img.shields.io/npm/v/@wingshq/mongodb.svg)](https://www.npmjs.com/package/@wingshq/mongodb)
[![Downloads](https://img.shields.io/npm/dm/@wingshq/mongodb.svg)](https://www.npmjs.com/package/@wingshq/mongodb)
[![License](https://img.shields.io/npm/l/@wingshq/mongodb.svg)](https://github.com/wingshq/wings/blob/main/LICENSE)

A powerful MongoDB database adapter for Wings and FeathersJS applications, providing seamless integration with MongoDB's document database features and aggregation framework.

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

The mongodb adapter provides a feature-rich MongoDB adapter with support for:

- ✅ **Full Wings Interface**: Modern API with null-safe returns and explicit bulk operations
- ✅ **FeathersJS Compatibility**: Drop-in replacement for existing FeathersJS applications
- ✅ **MongoDB Features**: Aggregation pipelines, indexes, transactions, and more
- ✅ **Rich Query Syntax**: Including `$like`, `$ilike`, `$isNull`, and all MongoDB operators
- ✅ **Advanced Aggregations**: Support for `$feathers` and `$wings` pipeline stages
- ✅ **TypeScript First**: Full TypeScript support with generics
- ✅ **Native Driver**: Built on the official MongoDB Node.js driver
- ✅ **Performance Optimized**: Efficient queries and smart pagination

## Installation

```bash
npm install @wingshq/mongodb mongodb
```

```bash
yarn add @wingshq/mongodb mongodb
```

```bash
pnpm add @wingshq/mongodb mongodb
```

## Quick Start

### Wings Interface

```typescript
import { MongoDBService } from '@wingshq/mongodb'
import { MongoClient } from 'mongodb'

interface User {
  _id?: string
  name: string
  email: string
  age: number
  tags: string[]
  createdAt: Date
}

// Connect to MongoDB
const client = new MongoClient('mongodb://localhost:27017')
await client.connect()
const db = client.db('myapp')

// Create service instance
const users = new MongoDBService<User>({
  Model: db.collection('users'),
  id: '_id'
})

// Create a user
const user = await users.create({
  name: 'Alice Johnson',
  email: 'alice@example.com',
  age: 30,
  tags: ['developer', 'mongodb'],
  createdAt: new Date()
})

// Find users with pagination
const result = await users.find({
  query: {
    age: { $gte: 18 },
    tags: { $in: ['developer'] },
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
import { FeathersMongoDBService } from '@wingshq/mongodb/feathers'
import { MongoClient } from 'mongodb'

// Drop-in replacement for @feathersjs/mongodb
const client = new MongoClient('mongodb://localhost:27017')
await client.connect()
const db = client.db('myapp')

const users = new FeathersMongoDBService({
  Model: db.collection('users'),
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
interface MongoDBServiceOptions<T = any> {
  Model: Collection<T> // MongoDB collection
  id?: string // Primary key field (default: '_id')
  multi?: boolean | string[] // Enable multi-record operations
  whitelist?: string[] // Allowed query operators
  filters?: Record<string, any> // Custom query filters
  operators?: string[] // Additional operators to allow
  disableObjectify?: boolean // Disable automatic ObjectId conversion
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

// With aggregation pipeline
const result = await service.find({
  pipeline: [
    { $match: { active: true } },
    { $wings: {} }, // Apply Wings query operators
    { $group: { _id: '$role', count: { $sum: 1 } } }
  ]
})
```

##### get()

```typescript
// Returns null if not found (no error thrown)
const user = await service.get('507f1f77bcf86cd799439011')
if (user === null) {
  console.log('User not found')
}

// With query parameters
const user = await service.get('507f1f77bcf86cd799439011', {
  query: {
    $select: ['name', 'email']
  }
})
```

##### create()

```typescript
// Create single document
const user = await service.create({
  name: 'Bob Smith',
  email: 'bob@example.com',
  metadata: {
    source: 'api',
    version: 1
  }
})

// Create multiple documents
const users = await service.create([
  { name: 'Alice', email: 'alice@example.com' },
  { name: 'Charlie', email: 'charlie@example.com' }
])

// MongoDB auto-generates _id if not provided
const user = await service.create({
  name: 'Dave'
  // _id will be generated automatically
})
```

##### patch()

```typescript
// Patch single document (returns null if not found)
const updated = await service.patch('507f1f77bcf86cd799439011', {
  status: 'active',
  'metadata.lastLogin': new Date()
})

// Bulk patch with patchMany
const updated = await service.patchMany(
  { status: 'archived' },
  {
    query: {
      lastActivity: { $lt: thirtyDaysAgo }
    },
    allowAll: false // Safety check required
  }
)

// MongoDB operators in patch
const updated = await service.patch(id, {
  $inc: { loginCount: 1 },
  $push: { tags: 'verified' }
})
```

##### remove()

```typescript
// Remove single document (returns null if not found)
const removed = await service.remove('507f1f77bcf86cd799439011')

// Bulk remove with removeMany
const removed = await service.removeMany({
  query: {
    status: 'deleted',
    deletedAt: { $lt: sevenDaysAgo }
  },
  allowAll: false // Safety check required
})

// Remove all documents (use with caution!)
const all = await service.removeAll()
```

### FeathersJS Interface

The FeathersJS wrapper maintains full backwards compatibility:

#### Key Differences

- Always throws `NotFound` errors instead of returning null
- `find()` returns paginated results by default unless `paginate: false`
- Supports `update()` method for full document replacement
- Bulk operations via `patch(null, data)` and `remove(null)`

```typescript
import { FeathersMongoDBService } from '@wingshq/mongodb/feathers'

const service = new FeathersMongoDBService<User>({
  Model: db.collection('users')
})

// Always paginated by default
const result = await service.find({})
// Returns: { total, limit, skip, data }

// Throws NotFound error
try {
  await service.get('507f1f77bcf86cd799439011')
} catch (error) {
  console.log(error.message) // "No record found for id '507f1f77bcf86cd799439011'"
}

// Update (full replacement)
const updated = await service.update('507f1f77bcf86cd799439011', {
  name: 'New Name',
  email: 'new@example.com',
  age: 25
})

// Bulk operations (FeathersJS style)
await service.patch(
  null,
  { archived: true },
  {
    query: { status: 'inactive' }
  }
)
```

### Configuration Options

#### Database Connection

```typescript
// Standard connection
const client = new MongoClient('mongodb://localhost:27017', {
  // Connection options
})

// Connection with authentication
const client = new MongoClient('mongodb://username:password@host:27017/database', {
  authSource: 'admin'
})

// Replica set connection
const client = new MongoClient('mongodb://host1:27017,host2:27017,host3:27017/?replicaSet=myReplSet')

// MongoDB Atlas connection
const client = new MongoClient(
  'mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority'
)
```

#### Custom ID Field

```typescript
// Use custom field as ID
const service = new MongoDBService<Document>({
  Model: db.collection('documents'),
  id: 'docId' // Use docId instead of _id
})

// Disable ObjectId conversion
const service = new MongoDBService({
  Model: db.collection('items'),
  disableObjectify: true // Don't convert string IDs to ObjectId
})
```

#### Whitelist Operators

```typescript
const service = new MongoDBService({
  Model: db.collection('users'),
  whitelist: ['$eq', '$ne', '$in', '$nin', '$lt', '$lte', '$gt', '$gte'],
  operators: ['$regex', '$exists'] // Add additional operators
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

// Nested document queries
await service.find({
  query: {
    'address.city': 'New York',
    'metadata.version': 2
  }
})
```

### Comparison Operators

```typescript
// Standard MongoDB operators
await service.find({ query: { age: { $gt: 21 } } })
await service.find({ query: { age: { $gte: 21 } } })
await service.find({ query: { price: { $lt: 100 } } })
await service.find({ query: { price: { $lte: 100 } } })
await service.find({ query: { status: { $ne: 'deleted' } } })

// In / Not in
await service.find({ query: { role: { $in: ['admin', 'moderator'] } } })
await service.find({ query: { status: { $nin: ['deleted', 'banned'] } } })

// Exists
await service.find({ query: { deletedAt: { $exists: false } } })
```

### Text Search Operators

```typescript
// SQL-like pattern matching (converted to MongoDB regex)
await service.find({ query: { email: { $like: '%@gmail.com' } } })
await service.find({ query: { name: { $like: 'John%' } } })

// Case-insensitive pattern matching
await service.find({ query: { name: { $ilike: '%smith%' } } })

// Not like
await service.find({ query: { email: { $notlike: '%@temp-mail.%' } } })

// Native MongoDB regex
await service.find({
  query: {
    description: { $regex: 'mongodb', $options: 'i' }
  }
})
```

### Null Handling

```typescript
// Find documents where field is null (Wings syntax)
await service.find({ query: { deletedAt: { $isNull: true } } })

// Find documents where field is not null
await service.find({ query: { deletedAt: { $isNull: false } } })

// MongoDB native syntax also works
await service.find({ query: { deletedAt: null } })
await service.find({ query: { deletedAt: { $ne: null } } })
```

### Array Operations

#### Query Operations

Array contains value:

```typescript
await service.find({ query: { tags: 'mongodb' } })
```

#### $in

Array contains any of values:

```typescript
await service.find({ query: { tags: { $in: ['mongodb', 'database'] } } })
```

#### $all

Array contains all values:

```typescript
await service.find({ query: { tags: { $all: ['mongodb', 'nosql'] } } })
```

#### $size

Query by array size:

```typescript
await service.find({ query: { tags: { $size: 3 } } })
```

#### $elemMatch

Match array elements with multiple conditions:

```typescript
await service.find({
  query: {
    comments: {
      $elemMatch: {
        score: { $gte: 5 },
        author: 'Alice'
      }
    }
  }
})
```

#### $pop

Removes the first or last element of an array:

```typescript
// Remove last element (1)
await service.patch(id, { $pop: { tags: 1 } })

// Remove first element (-1)
await service.patch(id, { $pop: { tags: -1 } })
```

#### $push

Appends elements to an array. Supports several modifiers:

```typescript
// Push single element
await service.patch(id, { $push: { tags: 'new-tag' } })

// $push with $each - Push multiple elements
await service.patch(id, {
  $push: { tags: { $each: ['mongodb', 'nosql', 'database'] } }
})

// $push with $slice - Limit array size after push
await service.patch(id, {
  $push: {
    recentViews: {
      $each: [newView],
      $slice: -10 // Keep only last 10 elements
    }
  }
})

// $push with $sort - Sort array after push
await service.patch(id, {
  $push: {
    scores: {
      $each: [85],
      $sort: -1 // Sort descending
    }
  }
})

// $push with $position - Insert at specific position
await service.patch(id, {
  $push: {
    items: {
      $each: ['new item'],
      $position: 0 // Insert at beginning
    }
  }
})
```

#### $pull

Removes all array elements that match a condition:

```typescript
// Remove specific value
await service.patch(id, { $pull: { tags: 'deprecated' } })

// Remove with condition
await service.patch(id, {
  $pull: { scores: { $lt: 60 } } // Remove all scores below 60
})
```

#### $pullAll

Removes all instances of specified values:

```typescript
await service.patch(id, {
  $pullAll: { tags: ['temp', 'test', 'debug'] }
})
```

#### $addToSet

Adds elements to array only if they don't already exist:

```typescript
// Add single element
await service.patch(id, { $addToSet: { tags: 'unique' } })

// Add multiple elements with $each
await service.patch(id, {
  $addToSet: {
    tags: { $each: ['mongodb', 'database'] }
  }
})
```

#### Array positional operators

For updating specific array elements:

```typescript
// $ - Update first matching element
await service.patch(
  id,
  {
    $set: { 'items.$.status': 'completed' }
  },
  {
    query: { 'items.id': itemId }
  }
)

// $[] - Update all array elements
await service.patch(id, {
  $inc: { 'scores.$[]': 5 } // Add 5 to all scores
})

// $[<identifier>] - Update elements matching arrayFilters
await service.patch(
  id,
  {
    $set: { 'items.$[elem].price': 99 }
  },
  {
    arrayFilters: [{ 'elem.category': 'electronics' }]
  }
)
```

### Logical Operators

```typescript
// OR conditions
await service.find({
  query: {
    $or: [{ status: 'active' }, { role: 'admin' }]
  }
})

// AND conditions (explicit)
await service.find({
  query: {
    $and: [{ age: { $gte: 18 } }, { age: { $lt: 65 } }]
  }
})

// NOT condition
await service.find({
  query: {
    $not: { status: 'deleted' }
  }
})

// NOR condition
await service.find({
  query: {
    $nor: [{ status: 'deleted' }, { status: 'banned' }]
  }
})
```

### Pagination and Sorting

```typescript
// Sorting
await service.find({
  query: {
    $sort: {
      createdAt: -1, // Descending
      name: 1 // Ascending
    }
  }
})

// Pagination
await service.find({
  query: {
    $limit: 20,
    $skip: 40, // Page 3 with 20 items per page
    $sort: { createdAt: -1 }
  }
})

// Field selection (projection)
await service.find({
  query: {
    $select: ['_id', 'name', 'email', 'createdAt']
  }
})

// Exclude fields
await service.find({
  query: {
    $select: { password: 0, internalNotes: 0 }
  }
})
```

## Advanced Features

### Aggregation Pipeline

```typescript
// Basic aggregation
const results = await service.find({
  pipeline: [
    { $match: { status: 'active' } },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        avgPrice: { $avg: '$price' }
      }
    },
    { $sort: { count: -1 } }
  ]
})

// Using $wings stage for query integration
const results = await service.find({
  query: {
    status: 'active',
    $sort: { createdAt: -1 },
    $limit: 10
  },
  pipeline: [
    { $wings: {} }, // Applies query filters, sort, and limit
    {
      $lookup: {
        from: 'orders',
        localField: '_id',
        foreignField: 'userId',
        as: 'orders'
      }
    },
    {
      $addFields: {
        orderCount: { $size: '$orders' }
      }
    }
  ]
})

// Raw aggregation with pagination
const results = await service.aggregateRaw([
  { $match: { year: 2024 } },
  {
    $facet: {
      metadata: [{ $count: 'total' }],
      data: [{ $skip: 20 }, { $limit: 10 }]
    }
  }
])
```

### Transactions

```typescript
// Start a session for transactions
const session = client.startSession()

try {
  await session.withTransaction(async () => {
    // All operations in the same transaction
    const user = await users.create({ name: 'Alice', balance: 1000 }, { session })

    await accounts.create({ userId: user._id, type: 'checking' }, { session })

    await transactions.create({ userId: user._id, amount: -100, type: 'withdrawal' }, { session })

    await users.patch(user._id, { $inc: { balance: -100 } }, { session })
  })
} finally {
  await session.endSession()
}
```

### Indexes and Performance

```typescript
// Create indexes for better performance
await db.collection('users').createIndex({ email: 1 }, { unique: true })
await db.collection('users').createIndex({ createdAt: -1 })
await db.collection('users').createIndex({ name: 'text' })

// Compound index
await db.collection('posts').createIndex({
  userId: 1,
  createdAt: -1
})

// Use hint to force index usage
const users = await service.find({
  query: { email: 'test@example.com' },
  hint: { email: 1 }
})

// Text search using text index
const results = await service.find({
  query: {
    $text: { $search: 'mongodb database' }
  }
})
```

### Geospatial Queries

```typescript
// Create geospatial index
await db.collection('locations').createIndex({ location: '2dsphere' })

// Find nearby locations
const nearby = await service.find({
  query: {
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [-73.9667, 40.78]
        },
        $maxDistance: 1000 // meters
      }
    }
  }
})

// Find within polygon
const withinArea = await service.find({
  query: {
    location: {
      $geoWithin: {
        $geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-73.98, 40.77],
              [-73.96, 40.77],
              [-73.96, 40.79],
              [-73.98, 40.79],
              [-73.98, 40.77]
            ]
          ]
        }
      }
    }
  }
})
```

### Change Streams

```typescript
// Watch for changes in real-time
const changeStream = db.collection('users').watch()

changeStream.on('change', (change) => {
  console.log('Change detected:', change)

  switch (change.operationType) {
    case 'insert':
      console.log('New user:', change.fullDocument)
      break
    case 'update':
      console.log('Updated fields:', change.updateDescription)
      break
    case 'delete':
      console.log('Deleted id:', change.documentKey._id)
      break
  }
})

// Watch with pipeline filter
const adminStream = db.collection('users').watch([{ $match: { 'fullDocument.role': 'admin' } }])
```

## Error Handling

### Wings Interface (Null Returns)

```typescript
// No errors thrown for not found
const user = await service.get('507f1f77bcf86cd799439011')
if (user === null) {
  // Handle not found case
}

// Validation errors
try {
  await service.patch(null as any, { name: 'Test' })
} catch (error) {
  // BadRequest: patch() requires a non-null id
}

// MongoDB errors are wrapped
try {
  await service.create({ email: 'duplicate@example.com' })
} catch (error) {
  // GeneralError with MongoDB error details
  if (error.data?.code === 11000) {
    console.log('Duplicate key error')
  }
}
```

### FeathersJS Interface (Error Throwing)

```typescript
import { NotFound, BadRequest, GeneralError } from '@feathersjs/errors'

try {
  await feathersService.get('507f1f77bcf86cd799439011')
} catch (error) {
  if (error instanceof NotFound) {
    console.log('User not found')
  }
}

// MongoDB duplicate key error
try {
  await feathersService.create({
    email: 'existing@example.com'
  })
} catch (error) {
  if (error instanceof GeneralError && error.data?.code === 11000) {
    console.log('Email already exists')
  }
}
```

### MongoDB-Specific Error Codes

```typescript
// Common MongoDB error codes
- 11000: Duplicate key error
- 121: Document validation failure
- 50: Exceeded time limit
- 13: Unauthorized
- 18: Authentication failed
```

## Migration Guide

### From @feathersjs/mongodb

```typescript
// Before
import service from '@feathersjs/mongodb'
const users = service({
  Model: db.collection('users'),
  paginate: {
    default: 10,
    max: 50
  }
})

// After (FeathersJS compatibility)
import { FeathersMongoDBService } from '@wingshq/mongodb/feathers'
const users = new FeathersMongoDBService({
  Model: db.collection('users')
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
  _id?: string
  email: string
  name: string
  role: 'user' | 'admin'
  metadata: {
    createdAt: Date
    updatedAt: Date
  }
}

const users = new MongoDBService<User>({
  Model: db.collection<User>('users')
})

// TypeScript enforces correct types
await users.create({
  email: 'test@example.com',
  name: 'Test User',
  role: 'user',
  metadata: {
    createdAt: new Date(),
    updatedAt: new Date()
  }
})

// Type error: role must be 'user' | 'admin'
await users.create({
  email: 'test@example.com',
  name: 'Test',
  role: 'superadmin' // ❌ Type error
})
```

### ObjectId Handling

```typescript
import { ObjectId } from 'mongodb'

interface Document {
  _id: ObjectId
  title: string
  content: string
}

const docs = new MongoDBService<Document>({
  Model: db.collection<Document>('documents')
})

// Automatic ObjectId conversion
const doc = await docs.get('507f1f77bcf86cd799439011') // String converted to ObjectId
const doc2 = await docs.get(new ObjectId('507f1f77bcf86cd799439011')) // Direct ObjectId
```

### Query Type Safety

```typescript
// Queries are partially type-checked
await users.find({
  query: {
    role: { $in: ['user', 'admin'] }, // ✅ Valid roles
    'metadata.createdAt': { $gte: new Date('2024-01-01') } // ✅ Nested field
  }
})

// Aggregation type safety
const results = await users.find({
  pipeline: [
    { $match: { role: 'admin' } },
    {
      $group: {
        _id: '$role',
        count: { $sum: 1 }
      }
    }
  ]
})
```

## Testing

The mongodb adapter works great for testing:

### In-Memory MongoDB

```typescript
import { MongoMemoryServer } from 'mongodb-memory-server'
import { MongoClient } from 'mongodb'
import { MongoDBService } from '@wingshq/mongodb'
import { beforeEach, afterEach, describe, it, expect } from 'vitest'

describe('UserService', () => {
  let mongod: MongoMemoryServer
  let client: MongoClient
  let userService: UserService

  beforeEach(async () => {
    // Start in-memory MongoDB instance
    mongod = await MongoMemoryServer.create()
    const uri = mongod.getUri()

    client = new MongoClient(uri)
    await client.connect()

    const db = client.db('test')
    userService = new UserService(
      new MongoDBService({
        Model: db.collection('users')
      })
    )
  })

  afterEach(async () => {
    await client.close()
    await mongod.stop()
  })

  it('should enforce unique emails', async () => {
    // Create unique index
    await client.db('test').collection('users').createIndex({ email: 1 }, { unique: true })

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

### Test Data Setup

```typescript
beforeEach(async () => {
  // Insert test data
  await db.collection('users').insertMany([
    { name: 'Alice', role: 'admin', age: 30 },
    { name: 'Bob', role: 'user', age: 25 },
    { name: 'Charlie', role: 'user', age: 35 }
  ])

  // Create indexes
  await db.collection('users').createIndex({ email: 1 }, { unique: true })
  await db.collection('users').createIndex({ name: 'text' })
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

# Test with real MongoDB
MONGODB_URI=mongodb://localhost:27017/test npm test
```

## Contributing

See the [main contributing guide](https://github.com/wingshq/wings/blob/main/CONTRIBUTING.md) for details on how to contribute to this project.

## License

[MIT](https://github.com/wingshq/wings/blob/main/LICENSE)
