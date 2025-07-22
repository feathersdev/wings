import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Run tests sequentially to avoid database conflicts
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true
      }
    },
    // Only include source TypeScript test files, exclude compiled versions
    include: [
      'test/**/*.test.ts'
    ],
    exclude: [
      'lib/**',
      'esm/**',
      'node_modules/**'
    ]
  }
})