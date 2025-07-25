import { generator, renderTemplate, toFile } from '@feathershq/pinion'
import { AdapterContext } from '../adapter'

interface Context extends AdapterContext {}

const template = ({ uppername, name }: Context) => /** ts */ `import { describe, it, expect } from 'vitest'
import { testSuite, TestConfig, Person } from '@wingshq/adapter-tests'
import { ${uppername}Adapter } from '../src'
import { Feathers${uppername}Adapter } from '../src/feathers'

// Test configuration
const WINGS_CONFIG: TestConfig = {
  adapterType: 'wings',
  // Add ${name}-specific test exclusions here if needed
  excludeTests: []
}

const FEATHERS_CONFIG: TestConfig = {
  adapterType: 'feathers',
  // Add ${name}-specific test exclusions here if needed
  excludeTests: []
}

describe('${uppername} Adapter Tests', () => {
  describe('Wings Interface', () => {
    const adapter = new ${uppername}Adapter<Person>({
      id: 'id'
      // Add ${name}-specific options here
    })

    it('instantiated the Wings adapter', () => {
      expect(adapter).toBeDefined()
      expect(adapter).toBeInstanceOf(${uppername}Adapter)
    })

    testSuite(adapter, WINGS_CONFIG)
  })

  describe('FeathersJS Interface', () => {
    const adapter = new Feathers${uppername}Adapter<Person>({
      id: 'id'
      // Add ${name}-specific options here
    })

    it('instantiated the FeathersJS adapter', () => {
      expect(adapter).toBeDefined()
      expect(adapter).toBeInstanceOf(Feathers${uppername}Adapter)
    })

    testSuite(adapter, FEATHERS_CONFIG)
  })
})
`

export const generate = (context: Context) =>
  generator(context).then(
    renderTemplate(template, toFile<Context>(context.packagePath, 'test', 'index.test.ts'))
  )