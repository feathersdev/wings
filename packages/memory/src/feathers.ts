import { NotFound, BadRequest } from '@feathersjs/errors'
import { AdapterInterface, Id, Paginated } from '@wingshq/adapter-commons'
import { MemoryAdapter, MemoryOptions, MemorySettings, MemoryParams } from './index.js'

/**
 * FeathersJS-compatible Memory adapter that wraps the Wings Memory adapter
 * Provides backwards compatibility with the FeathersJS interface
 */
export class FeathersMemoryAdapter<
  Result = unknown,
  Data = Partial<Result>,
  PatchData = Partial<Data>,
  UpdateData = Data,
  Params extends MemoryParams<Result> = MemoryParams<Result>
> implements AdapterInterface<Result, Data, PatchData, UpdateData, MemoryOptions<Result>, Params>
{
  private wingsAdapter: MemoryAdapter<Result, Data, PatchData, Params>

  constructor(options: MemorySettings<Result> = {}) {
    this.wingsAdapter = new MemoryAdapter(options)
  }

  get options() {
    return this.wingsAdapter.options
  }

  get id() {
    return this.wingsAdapter.id
  }

  get Model() {
    return this.wingsAdapter.Model
  }

  get _uId() {
    return this.wingsAdapter._uId
  }

  async find(params?: Params & { paginate?: false }): Promise<Result[]>
  async find(params: Params & { paginate: true }): Promise<Paginated<Result>>
  async find(params?: Params & { paginate?: boolean }): Promise<Result[] | Paginated<Result>> {
    // FeathersJS always returns paginated results by default unless explicitly disabled
    const shouldPaginate = params?.paginate !== false

    if (shouldPaginate && !params?.paginate) {
      return this.wingsAdapter.find({ ...params, paginate: true } as Params & { paginate: true })
    }

    return this.wingsAdapter.find(params as any)
  }

  async get(id: Id, params?: Params): Promise<Result> {
    const result = await this.wingsAdapter.get(id, params)

    if (result === null) {
      throw new NotFound(`No record found for id '${id}'`)
    }

    return result
  }

  create(data: Data[], params?: Params): Promise<Result[]>
  create(data: Data, params?: Params): Promise<Result>
  create(data: Data | Data[], params?: Params): Promise<Result[]> | Promise<Result> {
    return this.wingsAdapter.create(data as any, params) as any
  }

  async update(id: Id, data: UpdateData, params?: Params): Promise<Result> {
    if (id === null || Array.isArray(data)) {
      throw new BadRequest("You can not replace multiple instances. Did you mean 'patch'?")
    }

    // Get existing entry to ensure it exists and matches query (will throw NotFound if not)
    const oldEntry = await this.get(id, params)

    // For update, we need to replace the entire record
    const { Model = this.wingsAdapter.Model } = params || {}

    // We don't want our id to change type if it can be coerced
    const oldId = (oldEntry as any)[this.id]

    // eslint-disable-next-line eqeqeq
    const finalId = oldId == id ? oldId : id
    const modelId = String(finalId)

    Model[modelId] = {
      ...data,
      [this.id]: finalId
    } as Result

    // Return with only $select from params to apply field selection
    const selectParams = params?.query?.$select ? { query: { $select: params.query.$select } } : {}
    return this.get(finalId, selectParams as Params)
  }

  async patch(id: Id, data: PatchData, params?: Params): Promise<Result>
  async patch(id: null, data: PatchData, params?: Params): Promise<Result[]>
  async patch(id: Id | null, data: PatchData, params?: Params): Promise<Result[] | Result> {
    if (id === null) {
      // Bulk patch operation - delegate to patchMany with allowAll
      return this.wingsAdapter.patchMany(data, { ...params, allowAll: true })
    }

    const result = await this.wingsAdapter.patch(id, data, params)

    if (result === null) {
      throw new NotFound(`No record found for id '${id}'`)
    }

    return result
  }

  async remove(id: Id, params?: Params): Promise<Result>
  async remove(id: null, params?: Params): Promise<Result[]>
  async remove(id: Id | null, params?: Params): Promise<Result[] | Result> {
    if (id === null) {
      // Bulk remove operation - delegate to removeMany with allowAll
      return this.wingsAdapter.removeMany({ ...params, allowAll: true })
    }

    const result = await this.wingsAdapter.remove(id, params)

    if (result === null) {
      throw new NotFound(`No record found for id '${id}'`)
    }

    return result
  }
}

// Default export is the FeathersJS adapter wrapper
export default FeathersMemoryAdapter
