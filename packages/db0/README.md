# @wingshq/db0

FeathersJS db0 integration - A Wings adapter for [db0](https://db0.unjs.io/), providing universal database connectivity with support for Cloudflare Durable Objects and other SQL databases.

## Features

- Universal database interface following the FeathersJS service pattern
- Support for Cloudflare Durable Objects SQL
- Seamless integration with db0's unified API
- TypeScript support with proper type isolation

## Installation

```bash
npm install @wingshq/db0
```

## Usage

### Basic Usage

```typescript
import { Db0Service } from '@wingshq/db0';

const service = new Db0Service({
  // db0 configuration
});
```

### Cloudflare Worker Integration

```typescript
import { Db0CloudflareService } from '@wingshq/db0/cloudflare';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const service = new Db0CloudflareService({
      // Cloudflare-specific configuration
    });
    
    // Use the service following FeathersJS patterns
    return new Response('OK');
  }
};
```

## Development

This package includes Cloudflare Worker testing capabilities for development purposes.

### Available Scripts

- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run cf:dev` - Start Cloudflare Worker development server
- `npm run cf:deploy` - Deploy worker to Cloudflare
- `npm run cf:typegen` - Generate Cloudflare Worker TypeScript types

### Cloudflare Worker Testing

The package includes a test Cloudflare Worker setup in `test/cf-worker/` for development and testing purposes. This setup:

- Uses isolated TypeScript types that don't interfere with consuming packages
- Generates types to `test/cf-worker/types.d.ts` (gitignored)
- Provides a complete Durable Objects testing environment
- Does not pollute the global type space or affect library consumers

**Important**: The Cloudflare Worker types are development-only and do not affect packages that consume this library. Users can implement their own Cloudflare Workers with their own type definitions without conflicts.

### Type Safety

This package maintains strict type isolation:

- Internal Cloudflare Worker types are scoped to the test environment
- Published package types do not include Cloudflare-specific globals
- Consuming applications can use their own Cloudflare Worker configurations

## API

### Methods

All services implement the standard FeathersJS service interface:

- `find(params?)` - Query multiple records
- `get(id, params?)` - Retrieve a single record
- `create(data, params?)` - Create one or more records
- `update(id, data, params?)` - Replace a record
- `patch(id, data, params?)` - Update a record
- `remove(id, params?)` - Delete a record

## License

[License information]