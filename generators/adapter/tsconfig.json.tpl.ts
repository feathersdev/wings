import { generator, toFile, writeJSON } from '@feathershq/pinion'
import { AdapterContext } from '../adapter'

interface Context extends AdapterContext {}

export const generate = (context: Context) =>
  generator(context).then(
    writeJSON<Context>(
      () => ({
        extends: '../../tsconfig.json',
        include: ['src/**/*.ts'],
        exclude: ['lib/**', 'esm/**', 'test/**'],
        compilerOptions: {
          rootDir: './src',
          outDir: './lib'
        }
      }),
      toFile('packages', context.name, 'tsconfig.json')
    )
  )