import { generator, toFile, writeJSON } from '@feathershq/pinion'
import { AdapterContext } from '../adapter'

interface Context extends AdapterContext {}

export const generate = (context: Context) =>
  generator(context).then(
    writeJSON<Context>(
      ({ name, description }) => ({
        name: `@wingshq/${name}`,
        description,
        version: '0.0.0',
        private: true,
        packageManager: 'pnpm@10.11.0',
        homepage: 'https://wings.codes',
        keywords: ['wings', 'wings-adapter', name],
        license: 'MIT',
        repository: {
          type: 'git',
          url: 'git://github.com/wingshq/wings.git',
          directory: `packages/${name}`
        },
        author: {
          name: 'Wings contributors',
          email: 'hello@feathersjs.com',
          url: 'https://feathersjs.com'
        },
        contributors: [],
        bugs: {
          url: 'https://github.com/wingshq/wings/issues'
        },
        engines: {
          node: '>= 20'
        },
        files: ['CHANGELOG.md', 'LICENSE', 'README.md', 'src/**', 'lib/**', 'esm/**'],
        module: './esm/index.js',
        main: './lib/index.js',
        types: './src/index.ts',
        exports: {
          '.': {
            types: './src/index.ts',
            import: './esm/index.js',
            require: './lib/index.js'
          },
          './feathers': {
            types: './src/feathers.ts',
            import: './esm/feathers.js',
            require: './lib/feathers.js'
          }
        },
        scripts: {
          prepublish: 'npm run compile',
          compile: 'npm run compile:lib && npm run compile:esm',
          'compile:lib': 'shx rm -rf lib/ && tsc --module commonjs',
          'compile:esm': 'shx rm -rf esm/ && tsc --module es2020 --outDir esm',
          test: 'vitest run',
          'test:watch': 'vitest',
          lint: 'eslint \\"src/**/*.ts\\" \\"test/**/*.ts\\" --max-warnings 0',
          'lint:fix': 'eslint \\"src/**/*.ts\\" \\"test/**/*.ts\\" --fix && prettier \\"src/**/*.ts\\" \\"test/**/*.ts\\" --write'
        },
        publishConfig: {
          access: 'public'
        },
        dependencies: {
          '@feathersjs/errors': '^5.0.34',
          '@wingshq/adapter-commons': 'workspace:*'
        },
        devDependencies: {
          '@eslint/js': '^9.31.0',
          '@typescript-eslint/eslint-plugin': '^8.38.0',
          '@typescript-eslint/parser': '^8.38.0',
          '@wingshq/adapter-tests': 'workspace:*',
          'eslint': '^9.31.0',
          'eslint-config-prettier': '^10.1.8',
          'prettier': '^3.6.2',
          'shx': '^0.3.4',
          'typescript': '^5.8.3',
          'typescript-eslint': '^8.38.0',
          'vitest': '^3.2.4'
        }
      }),
      toFile('packages', context.name, 'package.json')
    )
  )