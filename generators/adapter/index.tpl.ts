import { generator, renderTemplate, toFile } from '@feathershq/pinion'
import { AdapterContext } from '../adapter'

interface Context extends AdapterContext {}

const template = ({ uppername }: Context) => `
import { 
  AdapterBase,
  AdapterServiceOptions,
  AdapterParams,
  AdapterOptions,
  Id,
  Paginated,
  PartialType
} from '@wingshq/adapter-commons'

export interface ${uppername}Options extends AdapterOptions {
  // Add ${uppername}-specific options here
}

export interface ${uppername}Params extends AdapterParams {
  // Add ${uppername}-specific params here
}

/**
 * ${uppername} adapter implementing the Wings interface
 */
export class ${uppername}Adapter<
  Result = any,
  Data = Partial<Result>,
  PatchData = PartialType<Result>,
  Options extends ${uppername}Options = ${uppername}Options,
  Params extends ${uppername}Params = ${uppername}Params
> extends AdapterBase<Result, Data, PatchData, ${uppername}Options, ${uppername}Params> {
  constructor(public options: Options) {
    super(options)
  }

  // Wings Interface Methods (null-safe returns)

  async find(params?: Params & { paginate?: false }): Promise<Result[]>
  async find(params: Params & { paginate: true }): Promise<Paginated<Result>>
  async find(params?: Params): Promise<Result[] | Paginated<Result>> {
    const isPaginated = params?.paginate === true
    
    // TODO: Implement ${uppername} find logic
    const data: Result[] = []

    if (isPaginated) {
      // Get total count for pagination
      const total = 0 // TODO: Implement count logic
      
      return {
        total,
        limit: params.query?.$limit || 0,
        skip: params.query?.$skip || 0,
        data
      }
    }

    return data
  }

  async get(id: Id, params?: Params): Promise<Result | null> {
    // TODO: Implement ${uppername} get logic
    // Return null if not found (Wings pattern)
    return null
  }

  async create(data: Data[], params?: Params): Promise<Result[]>
  async create(data: Data, params?: Params): Promise<Result>
  async create(data: Data | Data[], params?: Params): Promise<Result[] | Result> {
    if (Array.isArray(data)) {
      // TODO: Implement bulk create
      return Promise.all(data.map((current) => this.create(current, params)))
    }

    // TODO: Implement single create
    return data as Result
  }

  async patch(id: Id, data: PatchData, params?: Params): Promise<Result | null> {
    // Wings safety: prevent accidental bulk operations
    if (id === null || id === undefined) {
      throw new Error('patch() requires a non-null id. Use patchMany() for bulk operations.')
    }

    // TODO: Implement ${uppername} patch logic
    // Return null if not found (Wings pattern)
    return null
  }

  async patchMany(data: PatchData, params?: Params & { allowAll?: boolean }): Promise<Result[]> {
    const query = params?.query || {}
    
    // Safety check for bulk operations
    if (Object.keys(query).length === 0 && !params?.allowAll) {
      throw new Error('patchMany: No query provided. Use allowAll:true to patch all records')
    }

    // TODO: Implement bulk patch logic
    return []
  }

  async remove(id: Id, params?: Params): Promise<Result | null> {
    // Wings safety: prevent accidental bulk operations
    if (id === null || id === undefined) {
      throw new Error('remove() requires a non-null id. Use removeMany() for bulk operations.')
    }

    // TODO: Implement ${uppername} remove logic
    // Return null if not found (Wings pattern)
    return null
  }

  async removeMany(params?: Params & { allowAll?: boolean }): Promise<Result[]> {
    const query = params?.query || {}
    
    // Safety check for bulk operations
    if (Object.keys(query).length === 0 && !params?.allowAll) {
      throw new Error('removeMany: No query provided. Use allowAll:true to remove all records')
    }

    // TODO: Implement bulk remove logic
    return []
  }

  async removeAll(): Promise<Result[]> {
    // TODO: Implement remove all logic
    return []
  }
}
`

export const generate = (context: Context) =>
  generator(context).then(renderTemplate(template, toFile(context.packagePath, 'src', 'index.ts')))