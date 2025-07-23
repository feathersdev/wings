import type { Callable, PinionContext } from '@feathershq/pinion'
import { generator, prompt, runGenerators, toFile } from '@feathershq/pinion'

export interface AdapterContext extends PinionContext {
  name: string
  uppername: string
  description: string
  packagePath: Callable<string, AdapterContext>
}

export const generate = (context: AdapterContext) =>
  generator(context)
    .then(async (ctx) => {
      // Check if arguments were provided via command line
      const args = process.argv.slice(2)
      
      if (args.length >= 2) {
        // Use command line arguments
        return {
          ...ctx,
          name: args[0],
          description: args.slice(1).join(' ')
        }
      } else {
        // Interactive prompts
        return prompt<AdapterContext>([
          {
            type: 'input',
            name: 'name',
            message: 'What is the name of the adapter?'
          },
          {
            type: 'input',
            name: 'description',
            message: 'Write a short description'
          }
        ])(ctx)
      }
    })
    .then((ctx) => {
      return {
        ...ctx,
        uppername: ctx.name.charAt(0).toUpperCase() + ctx.name.slice(1),
        packagePath: toFile('packages', ctx.name)
      }
    })
    .then(runGenerators(__dirname, 'adapter'))