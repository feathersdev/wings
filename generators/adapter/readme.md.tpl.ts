import { generator, renderTemplate, toFile } from '@feathershq/pinion'
import { AdapterContext } from '../adapter'

interface Context extends AdapterContext {}

const template = ({ name, uppername, description }: Context) => `# @wingshq/${name}

[![CI](https://github.com/wingshq/wings/workflows/CI/badge.svg)](https://github.com/wingshq/wings/actions?query=workflow%3ACI)
[![npm version](https://img.shields.io/npm/v/@wingshq/${name}.svg)](https://www.npmjs.com/package/@wingshq/${name})
[![Downloads](https://img.shields.io/npm/dm/@wingshq/${name}.svg)](https://www.npmjs.com/package/@wingshq/${name})
[![License](https://img.shields.io/npm/l/@wingshq/${name}.svg)](https://github.com/wingshq/wings/blob/main/LICENSE)

${description}

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

The ${name} adapter provides support for:

- ✅ **Full Wings Interface**: Modern API with null-safe returns and explicit bulk operations
- ✅ **FeathersJS Compatibility**: Drop-in replacement for existing FeathersJS applications
- ✅ **Rich Query Syntax**: Including all standard operators
- ✅ **TypeScript First**: Full TypeScript support with generics
- ✅ **TODO**: Add ${name}-specific features here

## Installation

\`\`\`bash
npm install @wingshq/${name}
\`\`\`

\`\`\`bash
yarn add @wingshq/${name}
\`\`\`

\`\`\`bash
pnpm add @wingshq/${name}
\`\`\`

## Quick Start

### Wings Interface

\`\`\`typescript
import { ${uppername}Adapter } from '@wingshq/${name}'

interface User {
  id: number
  name: string
  email: string
}

// Create adapter instance
const users = new ${uppername}Adapter<User>({
  // TODO: Add ${name}-specific configuration
})

// Create a user
const user = await users.create({
  name: 'Alice Johnson',
  email: 'alice@example.com'
})

// Find users with pagination
const result = await users.find({
  query: {
    $sort: { name: 1 },
    $limit: 10
  },
  paginate: true
})
console.log(result.data) // Array of users
console.log(result.total) // Total count
\`\`\`

### FeathersJS Interface

\`\`\`typescript
import { Feathers${uppername}Adapter } from '@wingshq/${name}/feathers'

// Drop-in replacement for FeathersJS adapters
const users = new Feathers${uppername}Adapter({
  // TODO: Add configuration
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
\`\`\`

## API Documentation

### Wings Interface

The Wings interface provides a modern, type-safe API with explicit operations.

#### Methods

See the [Wings adapter documentation](https://github.com/wingshq/wings/blob/main/packages/adapter-commons/README.md) for detailed method documentation.

### FeathersJS Interface

The FeathersJS wrapper maintains full backwards compatibility.

See the [FeathersJS adapter documentation](https://docs.feathersjs.com/api/databases/common) for detailed method documentation.

## Query Syntax

TODO: Document ${name}-specific query syntax and operators.

## Advanced Features

TODO: Document ${name}-specific advanced features.

## Error Handling

### Wings Interface (Null Returns)

\`\`\`typescript
// No errors thrown for not found
const user = await adapter.get(999)
if (user === null) {
  // Handle not found case
}
\`\`\`

### FeathersJS Interface (Error Throwing)

\`\`\`typescript
import { NotFound } from '@feathersjs/errors'

try {
  await feathersAdapter.get(999)
} catch (error) {
  if (error instanceof NotFound) {
    console.log('User not found')
  }
}
\`\`\`

## Migration Guide

TODO: Add migration guide from existing ${name} adapters.

## TypeScript Support

The adapter is written in TypeScript and provides full type safety.

## Testing

### Running Tests

\`\`\`bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm test -- --coverage
\`\`\`

## Contributing

See the [main contributing guide](https://github.com/wingshq/wings/blob/main/CONTRIBUTING.md) for details on how to contribute to this project.

## License

[MIT](https://github.com/wingshq/wings/blob/main/LICENSE)
`

export const generate = (context: Context) =>
  generator(context).then(renderTemplate(template, toFile(context.packagePath, 'README.md')))