import { generator, renderTemplate, toFile } from '@feathershq/pinion'
import { AdapterContext } from '../adapter'

interface Context extends AdapterContext {}

const template = ({ uppername }: Context) => `
import { NotFound, BadRequest } from '@feathersjs/errors'
import { 
  AdapterInterface,
  AdapterParams,
  Id,
  Paginated
} from '@wingshq/adapter-commons'
import { ${uppername}Adapter, ${uppername}Options, ${uppername}Params } from './index'

/**
 * FeathersJS-compatible wrapper for ${uppername}Adapter
 * Provides backwards compatibility with FeathersJS error throwing patterns
 */
export class Feathers${uppername}Adapter<
  Result = any,
  Data = Partial<Result>,
  PatchData = Partial<Result>,
  UpdateData = Data,
  Options extends ${uppername}Options = ${uppername}Options,
  Params extends ${uppername}Params = ${uppername}Params
> implements AdapterInterface<Result, Data, PatchData, UpdateData, Options, Params> {
  private adapter: ${uppername}Adapter<Result, Data, PatchData, Options, Params>

  constructor(options: Options) {
    this.adapter = new ${uppername}Adapter<Result, Data, PatchData, Options, Params>(options)
  }

  get id() {
    return this.adapter.id
  }

  get options() {
    return this.adapter.options
  }

  // FeathersJS Interface Methods (error-throwing)

  async find(params?: Params): Promise<Paginated<Result> | Result[]> {
    // FeathersJS defaults to paginated results unless explicitly disabled
    const paginate = params?.paginate !== false
    
    if (paginate) {
      return this.adapter.find({ ...params, paginate: true } as Params & { paginate: true })
    }
    
    return this.adapter.find({ ...params, paginate: false } as Params & { paginate: false })
  }

  async get(id: Id, params?: Params): Promise<Result> {
    const result = await this.adapter.get(id, params)
    
    if (result === null) {
      throw new NotFound(\`No record found for id '\${id}'\`)
    }
    
    return result
  }

  async create(data: Data[], params?: Params): Promise<Result[]>
  async create(data: Data, params?: Params): Promise<Result>
  async create(data: Data | Data[], params?: Params): Promise<Result[] | Result> {
    return this.adapter.create(data as any, params)
  }

  async update(id: Id, data: UpdateData, params?: Params): Promise<Result> {
    if (id === null || id === undefined) {
      throw new BadRequest('You can not replace multiple instances')
    }

    // Full replacement - get existing record first
    const existing = await this.get(id, params)
    
    // Replace with new data (preserving id)
    const idField = this.adapter.id
    const updated = {
      ...data,
      [idField]: existing[idField]
    } as PatchData

    const result = await this.adapter.patch(id, updated, params)
    
    if (result === null) {
      throw new NotFound(\`No record found for id '\${id}'\`)
    }
    
    return result
  }

  async patch(id: Id | null, data: PatchData, params?: Params): Promise<Result | Result[]> {
    if (id === null) {
      // Bulk patch - delegate to patchMany with allowAll
      return this.adapter.patchMany(data, { ...params, allowAll: true })
    }
    
    const result = await this.adapter.patch(id, data, params)
    
    if (result === null) {
      throw new NotFound(\`No record found for id '\${id}'\`)
    }
    
    return result
  }

  async remove(id: Id | null, params?: Params): Promise<Result | Result[]> {
    if (id === null) {
      // Bulk remove - delegate to removeMany with allowAll
      return this.adapter.removeMany({ ...params, allowAll: true })
    }
    
    const result = await this.adapter.remove(id, params)
    
    if (result === null) {
      throw new NotFound(\`No record found for id '\${id}'\`)
    }
    
    return result
  }
}
`

export const generate = (context: Context) =>
  generator(context).then(renderTemplate(template, toFile(context.packagePath, 'src', 'feathers.ts')))