# Contributing to Wings

Thank you for your interest in contributing to Wings! This guide will help you get started with contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Features](#suggesting-features)
  - [Submitting Pull Requests](#submitting-pull-requests)
- [Development Setup](#development-setup)
- [Development Workflow](#development-workflow)
- [Creating a New Adapter](#creating-a-new-adapter)
- [Testing Guidelines](#testing-guidelines)
- [Code Style](#code-style)
- [Commit Guidelines](#commit-guidelines)
- [Documentation](#documentation)
- [Release Process](#release-process)

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](https://github.com/feathersdev/feathers/blob/dove/CODE_OF_CONDUCT.md). Please read it before contributing.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When creating a bug report, include:

- **Clear title and description**
- **Steps to reproduce** the issue
- **Expected behavior** vs what actually happened
- **Environment details** (Node.js version, OS, adapter versions)
- **Code examples** that demonstrate the issue
- **Error messages** and stack traces

### Suggesting Features

Feature requests are welcome! Please provide:

- **Clear use case** explaining why this feature would be useful
- **Proposed API** showing how the feature would work
- **Alternative solutions** you've considered
- **Breaking changes** if any

### Submitting Pull Requests

1. **Discuss first** - For significant changes, open an issue first to discuss
2. **Fork the repository** and create your branch from `main`
3. **Follow the setup instructions** below
4. **Write/update tests** for your changes
5. **Ensure all tests pass** and the build succeeds
6. **Update documentation** as needed
7. **Follow our commit guidelines** (see below)
8. **Submit the PR** with a clear description

## Development Setup

### Prerequisites

- Node.js >= 18
- npm >= 9
- Docker (optional, for database testing)

### Initial Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/wings.git
cd wings

# Add upstream remote
git remote add upstream https://github.com/feathersdev/wings.git

# Install dependencies
npm install

# Build all packages
npm run compile

# Run tests to verify setup
npm test
```

## Development Workflow

### Working on Existing Packages

```bash
# Navigate to the package
cd packages/mongodb

# Make your changes
# ...

# Build the package
npm run compile

# Run tests
npm test

# Lint your code
npm run lint:fix

# Run tests with coverage
npm run coverage
```

### Testing Against Different Databases

For SQL adapters:

```bash
# Start PostgreSQL
docker-compose up -d postgres

# Run tests with PostgreSQL
TEST_DB=postgres npm test

# Stop PostgreSQL
docker-compose down
```

### Running All Tests

```bash
# From the root directory
npm test

# With coverage
npm run coverage

# Specific package only
npm run test -- packages/knex
```

## Creating a New Adapter

### Using the Generator

```bash
# From the root directory
npm run generate:adapter

# Or with arguments to skip prompts
npx pinion run generators/adapter.ts my-adapter "Description of my adapter"
```

### Adapter Requirements

Your adapter must:

1. **Extend AdapterBase** from `@wingshq/adapter-commons`
2. **Implement all required methods** of the Wings interface
3. **Pass the shared test suite** from `@wingshq/adapter-tests`
4. **Include comprehensive documentation** in README.md
5. **Support both CommonJS and ESM** module formats

### Adapter Structure

```typescript
import { AdapterBase, WingsAdapter } from '@wingshq/adapter-commons'

export class MyAdapter<T> extends AdapterBase<T> implements WingsAdapter<T> {
  constructor(options: MyAdapterOptions) {
    super(options)
    // Initialize your adapter
  }

  async find(params?: Params): Promise<T[] | Paginated<T>> {
    // Implementation
  }

  async get(id: Id, params?: Params): Promise<T | null> {
    // Implementation
  }

  // ... implement all required methods
}
```

### Testing Your Adapter

```typescript
// test/index.test.ts
import { fullWingsTests } from '@wingshq/adapter-tests'
import { MyAdapter } from '../src'

describe('MyAdapter', () => {
  fullWingsTests(
    () => new MyAdapter({ /* options */ }),
    'id', // ID field
    {
      // Test configuration
      hasNullTypeSupport: true,
      hasBooleanTypeSupport: true
    }
  )
  
  // Add adapter-specific tests here
})
```

## Testing Guidelines

### Test Organization

- **Unit tests** for individual methods and utilities
- **Integration tests** using the shared test suite
- **Database-specific tests** for adapter-specific features

### Writing Tests

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'

describe('Feature', () => {
  let service: MyAdapter<TestType>

  beforeEach(() => {
    service = new MyAdapter({ /* options */ })
  })

  afterEach(async () => {
    // Cleanup
  })

  it('should do something', async () => {
    const result = await service.someMethod()
    expect(result).toBeDefined()
  })
})
```

### Test Coverage

- Aim for **>90% code coverage**
- All public methods must have tests
- Edge cases and error conditions must be tested
- Database-specific behaviors must be documented and tested

## Code Style

### TypeScript

- Use **TypeScript strict mode**
- Prefer **interfaces over types** for object shapes
- Use **generics** for reusable code
- Document complex types with JSDoc

### General Guidelines

- **No console.log** statements in production code
- **Async/await** over promises chains
- **Named exports** over default exports
- **Descriptive variable names** over comments

### Linting and Formatting

```bash
# Check code style
npm run lint

# Auto-fix issues
npm run lint:fix
```

Our ESLint configuration enforces:
- **Zero warnings policy** (`--max-warnings 0`)
- **Prettier integration** for consistent formatting
- **TypeScript best practices**

## Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): subject

body (optional)

footer (optional)
```

### Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, etc)
- **refactor**: Code refactoring
- **test**: Test additions or changes
- **chore**: Maintenance tasks
- **perf**: Performance improvements

### Examples

```bash
# Feature
git commit -m "feat(mongodb): add support for $regex operator"

# Bug fix
git commit -m "fix(knex): handle null values in patch operations"

# Documentation
git commit -m "docs(readme): add migration guide section"

# Multiple changes
git commit -m "feat(wings): add patchMany method

- Add patchMany to WingsAdapter interface
- Implement in all adapters
- Add comprehensive tests
- Update documentation

BREAKING CHANGE: patch(null, data) no longer supported"
```

## Documentation

### Code Documentation

- Add **JSDoc comments** for all public methods
- Include **@example** sections for complex methods
- Document **parameters and return types**
- Explain **edge cases and exceptions**

### README Updates

When adding features or making changes:

1. Update the package's README.md
2. Add examples showing the new functionality
3. Update the API documentation section
4. Note any breaking changes

### CLAUDE.md Updates

Update the CLAUDE.md file when:
- Adding new development commands
- Changing testing procedures
- Modifying the project structure
- Adding adapter-specific requirements

## Release Process

Wings uses automated releases through GitHub Actions:

1. **Version bumps** are handled automatically based on commit types
2. **Changelogs** are generated from commit messages
3. **NPM publishing** happens automatically for tagged releases

### Pre-release Checklist

Before merging a PR that will trigger a release:

- [ ] All tests pass
- [ ] Documentation is updated
- [ ] Breaking changes are clearly marked
- [ ] Package versions are correct
- [ ] CHANGELOG entries make sense

## Getting Help

- **Discord**: Join our [Discord server](https://discord.gg/qa8kez8QBx)
- **Issues**: Check existing [issues](https://github.com/feathersdev/wings/issues)
- **Discussions**: Start a [discussion](https://github.com/feathersdev/wings/discussions)

## Recognition

Contributors are recognized in:
- The [contributors list](https://github.com/feathersdev/wings/graphs/contributors)
- Release notes for significant contributions
- The Feathers.dev community highlights

Thank you for contributing to Wings! 🚀