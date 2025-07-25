import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    conditions: ['development', 'types', 'import', 'require']
  },
  test: {
    globals: true,
    environment: 'node',
    exclude: [
      'node_modules/**',
      'lib/**',
      'esm/**'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      exclude: [
        'node_modules/**',
        'test/**',
        'lib/**',
        'esm/**'
      ]
    }
  }
})