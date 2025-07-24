# Wings

---

[![CI](https://github.com/feathersdev/wings/workflows/CI/badge.svg)](https://github.com/feathersdev/wings/actions?query=workflow%3ACI)
[![Maintainability](https://api.codeclimate.com/v1/badges/cb5ec42a2d0cc1a47a02/maintainability)](https://codeclimate.com/github/feathersdev/wings/maintainability)
[![Test Coverage](https://api.codeclimate.com/v1/badges/cb5ec42a2d0cc1a47a02/test_coverage)](https://codeclimate.com/github/feathersdev/wings/test_coverage)
[![Download Status](https://img.shields.io/npm/dm/@feathersjs/feathers.svg?style=flat-square)](https://www.npmjs.com/package/@feathersjs/feathers)
[![Discord](https://badgen.net/badge/icon/discord?icon=discord&label)](https://discord.gg/qa8kez8QBx)

Wings is a modern TypeScript library providing universal database adapters with a unified interface. It enables seamless integration of different databases into any TypeScript or JavaScript application with advanced features like smart pagination, type safety, and comprehensive query operators.

## Table of Contents

- [Overview](#overview)
- [Wings vs FeathersJS Adapters](#wings-vs-feathersjs-adapters)
- [Key Features](#key-features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Available Adapters](#available-adapters)
- [FeathersJS Compatibility](#feathersjs-compatibility)
- [Development](#development)
- [Testing](#testing)
- [Contributing](#contributing)
- [License](#license)

## Overview

Wings provides a consistent, type-safe interface for working with different databases. Whether you're using MongoDB, PostgreSQL, MySQL, SQLite, or even in-memory storage, Wings offers the same intuitive API with database-specific optimizations.

### Core Principles

- **Universal Interface**: One API to rule them all - works consistently across all databases
- **Type Safety**: Full TypeScript support with automatic type inference
- **Performance First**: Smart pagination, optimized queries, and minimal overhead
- **Database Native**: Leverages each database's unique features while maintaining consistency
- **Modern Patterns**: Built for contemporary TypeScript applications

## Wings vs FeathersJS Adapters

Wings represents the next evolution of database adapters, building on lessons learned from FeathersJS while introducing modern patterns and improved developer experience.

### Key Differences

| Feature             | Wings Adapters                                                              | FeathersJS Adapters                            |
| ------------------- | --------------------------------------------------------------------------- | ---------------------------------------------- |
| **Return Types**    | Smart returns - arrays by default, `Paginated<T>` when explicitly requested | Always returns `Paginated<T>` objects          |
| **Error Handling**  | Returns `null` for not-found cases                                          | Throws `NotFound` errors                       |
| **Bulk Operations** | Explicit `patchMany()` and `removeMany()` methods with safety controls      | Uses `patch(null)` and `remove(null)` patterns |
| **Type Inference**  | Automatic TypeScript inference based on parameters                          | Manual type assertions often needed            |
| **Query Operators** | Extended operators including `$like`, `$ilike`, `$isNull`                   | Standard operators only                        |
| **Update Method**   | Single `patch()` method for all updates                                     | Separate `update()` and `patch()` methods      |
| **Safety**          | Built-in safety controls for bulk operations                                | No built-in safety mechanisms                  |

### Code Comparison

```typescript
// Wings Adapter - Modern, intuitive patterns
const users = await adapter.find({ query: { active: true } }) // Returns User[]
const paginated = await adapter.find({ query: { active: true }, paginate: true }) // Returns Paginated<User>
const user = await adapter.get(123) // Returns User | null

// Bulk operations with safety
await adapter.patchMany({ active: false }, { query: { role: 'admin' } }) // Fails - needs allowAll
await adapter.patchMany({ active: false }, { query: { role: 'admin' }, allowAll: true }) // Success

// FeathersJS Adapter - Legacy patterns
const result = await adapter.find({ query: { active: true } }) // Always Paginated<User>
const users = result.data // Extra step to get array
const user = await adapter.get(123) // Throws NotFound if missing

// Bulk operations without safety
await adapter.patch(null, { active: false }, { query: { role: 'admin' } }) // No safety check
```

## Key Features

### 🚀 Smart Pagination

Automatically returns the right type based on your needs - simple arrays for basic queries, paginated results when you need counts.

### 🔒 Type Safety

Full TypeScript support with generics, type inference, and compile-time safety.

### 🎯 Null-Safe Operations

No more try-catch blocks for not-found errors - operations return `null` when items don't exist.

### 🛡️ Safety Controls

Built-in protection against accidental mass updates or deletions with explicit `allowAll` requirements.

### 🔍 Advanced Query Operators

Beyond basic queries with SQL-like operators: `$like`, `$ilike`, `$isNull`, and more.

### 📦 Database Agnostic

Write once, run anywhere - your code works the same whether using MongoDB, PostgreSQL, or any other supported database.

## Installation

Install the core package and your preferred adapter:

```bash
# Core interfaces (required)
npm install @wingshq/adapter-commons

# Choose your adapter
npm install @wingshq/memory      # In-memory adapter
npm install @wingshq/mongodb     # MongoDB adapter
npm install @wingshq/knex        # SQL adapter (PostgreSQL, MySQL, SQLite)
npm install @wingshq/kysely      # Type-safe SQL query builder
npm install @wingshq/db0         # Modern SQL with edge runtime support
```

## Quick Start

```typescript
import { MemoryAdapter } from '@wingshq/memory'

interface User {
  id?: number
  name: string
  email: string
  active: boolean
}

// Create an adapter instance
const users = new MemoryAdapter<User>({
  id: 'id',
  startId: 1
})

// Create users
const alice = await users.create({
  name: 'Alice',
  email: 'alice@example.com',
  active: true
})

// Find active users (returns array)
const activeUsers = await users.find({
  query: { active: true }
})

// Find with pagination (returns { data, total, limit, skip })
const paginatedUsers = await users.find({
  query: { active: true },
  paginate: true,
  limit: 10
})

// Update a user (returns null if not found)
const updated = await users.patch(alice.id, {
  active: false
})

// Bulk update with safety
await users.patchMany(
  { active: false },
  {
    query: { email: { $like: '%spam.com' } },
    allowAll: true
  }
)
```

## Available Adapters

### Core Packages

| Package                                              | Description                    | Documentation                                |
| ---------------------------------------------------- | ------------------------------ | -------------------------------------------- |
| [@wingshq/adapter-commons](packages/adapter-commons) | Core interfaces and utilities  | [README](packages/adapter-commons/README.md) |
| [@wingshq/adapter-tests](packages/adapter-tests)     | Shared test suite for adapters | [README](packages/adapter-tests/README.md)   |

### Database Adapters

| Package                              | Database Support                     | Documentation                        |
| ------------------------------------ | ------------------------------------ | ------------------------------------ |
| [@wingshq/memory](packages/memory)   | In-memory storage                    | [README](packages/memory/README.md)  |
| [@wingshq/mongodb](packages/mongodb) | MongoDB                              | [README](packages/mongodb/README.md) |
| [@wingshq/knex](packages/knex)       | PostgreSQL, MySQL, SQLite, and more  | [README](packages/knex/README.md)    |
| [@wingshq/kysely](packages/kysely)   | Type-safe SQL query builder          | [README](packages/kysely/README.md)  |
| [@wingshq/db0](packages/db0)         | Modern SQL with edge runtime support | [README](packages/db0/README.md)     |

## FeathersJS Compatibility

Wings provides full backwards compatibility with FeathersJS through optional wrapper packages. This allows gradual migration and continued use of existing FeathersJS tooling.

> **Note**: In Feathers v6, services and adapters are decoupled. Services handle API endpoints while adapters handle database operations. Wings adapters can be used directly or through FeathersJS compatibility wrappers.

### Using FeathersJS Wrappers

```typescript
// Import the FeathersJS wrapper
import { FeathersKnexAdapter } from '@wingshq/knex/feathers'

// Create adapter instance
const adapter = new FeathersKnexAdapter({
  name: 'users',
  Model: db
})

// All FeathersJS adapter patterns work unchanged
const paginated = await adapter.find({ query: { active: true } }) // Always returns Paginated<T>
const user = await adapter.get(123) // Throws NotFound if missing
await adapter.update(123, fullUserData) // Full update method available
```

### Migration Path

1. **Drop-in Replacement**: Start by replacing FeathersJS adapters with Wings compatibility wrappers
2. **Gradual Adoption**: Migrate adapters to native Wings interface as needed
3. **Full Migration**: Eventually move all adapters to Wings for best performance and developer experience

## Development

### Prerequisites

- Node.js >= 18
- npm >= 9

### Setting Up Development Environment

```bash
# Clone the repository
git clone https://github.com/feathersdev/wings.git
cd wings

# Install dependencies
npm install

# Build all packages
npm run compile

# Run tests
npm test
```

### Package Development

Each package in the monorepo has its own development commands:

```bash
# Navigate to a package
cd packages/mongodb

# Build the package
npm run compile

# Run tests
npm test

# Run tests with coverage
npm run coverage

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

### Database-Specific Development

For SQL adapters (knex, kysely, db0), you can test against different databases:

```bash
# Start PostgreSQL for testing
docker-compose up -d postgres

# Run tests with PostgreSQL
TEST_DB=postgres npm test

# Stop PostgreSQL
docker-compose down
```

## Testing

Wings uses a comprehensive shared test suite to ensure consistency across all adapters.

### Running Tests

```bash
# Run all tests
npm test

# Run tests for a specific package
npm run test -- packages/mongodb

# Run tests with coverage
npm run coverage

# Run tests in watch mode (using vitest)
cd packages/mongodb && npm run test:watch
```

### Test Organization

Tests are organized into three categories:

1. **Common Tests**: Shared functionality across all interfaces
2. **Wings Tests**: Wings-specific features and behaviors
3. **FeathersJS Tests**: Compatibility tests for FeathersJS wrappers

### Writing Adapter Tests

```typescript
import { fullWingsTests } from '@wingshq/adapter-tests'
import { MyAdapter } from '../src'

// Run the full Wings test suite
fullWingsTests(
  () => new MyAdapter({ id: 'id' }), // Service factory
  'id', // ID property
  {
    // Test configuration
    hasNullTypeSupport: true,
    hasBooleanTypeSupport: true
  }
)
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Creating a New Adapter

To generate a new adapter:

```bash
npm run generate:adapter
```

This will scaffold a new adapter package with:

- TypeScript configuration
- Test setup with the shared test suite
- Basic adapter implementation extending AdapterBase
- Package.json with standard scripts
- README template

All Wings adapters extend the `AdapterBase` class from `@wingshq/adapter-commons`, which provides:

- Common validation methods (`validateNonNullId`, `validateBulkParams`)
- Standard query filtering and separation logic
- Paginated result building
- SQL-like operator conversion for non-SQL databases
- Consistent error handling patterns

### Development Workflow

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Ensure all tests pass
5. Submit a pull request

### Code Style

- We use ESLint and Prettier for code formatting
- Run `npm run lint` to check code style
- Run `npm run lint:fix` to automatically fix issues

## License

Copyright (c) 2012-Present [Feathers.dev](https://feathers.dev)

Licensed under the [MIT license](LICENSE).
