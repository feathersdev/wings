import { AdapterInterface, Id, Paginated, Primitive } from '@wingshq/adapter-commons'
import { NotFound } from '@feathersjs/errors'
import { MongodbAdapter, MongodbParams, MongodbOptions, MongodbSettings } from './index.js'

/**
 * FeathersJS compatibility wrapper for the MongoDB Wings adapter
 * Provides backwards compatibility with the traditional FeathersJS adapter interface
 */
export class FeathersMongodbAdapter<
  Result = unknown,
  Data = Partial<Result>,
  PatchData = Partial<Data>,
  UpdateData = Result,
  Params extends MongodbParams<Result> = MongodbParams<Result>
> implements AdapterInterface<Result, Data, PatchData, UpdateData, MongodbOptions, Params>
{
  private wingsAdapter: MongodbAdapter<Result, Data, PatchData, Params>

  constructor(settings: MongodbSettings) {
    this.wingsAdapter = new MongodbAdapter<Result, Data, PatchData, Params>(settings)
  }

  get id() {
    return this.wingsAdapter.id
  }

  get options() {
    return this.wingsAdapter.options
  }

  // Always return paginated results unless paginate: false is explicitly set
  async find(params?: Params & { paginate?: false }): Promise<Result[]>
  async find(params: Params & { paginate: true }): Promise<Paginated<Result>>
  async find(params?: Params & { paginate?: boolean }): Promise<Result[] | Paginated<Result>> {
    // If paginate is explicitly false, return array
    if (params && 'paginate' in params && params.paginate === false) {
      return this.wingsAdapter.find({ ...params, paginate: false })
    }

    // Otherwise, always paginate for FeathersJS compatibility
    // Create clean params object with paginate: true
    const cleanParams = { ...(params || {}) }
    // Remove any undefined paginate value to avoid confusion
    if ('paginate' in cleanParams && cleanParams.paginate === undefined) {
      delete cleanParams.paginate
    }
    const paginateParams = { ...cleanParams, paginate: true } as Params & { paginate: true }
    return this.wingsAdapter.find(paginateParams)
  }

  async get(id: Id, params?: Params): Promise<Result> {
    const result = await this.wingsAdapter.get(id as Primitive, params)
    if (result === null) {
      throw new NotFound(`No record found for id '${id}'`)
    }
    return result
  }

  async create(data: Data[], params?: Params): Promise<Result[]>
  async create(data: Data, params?: Params): Promise<Result>
  async create(data: Data | Data[], params?: Params): Promise<Result[] | Result> {
    return this.wingsAdapter.create(data as any, params)
  }

  async update(id: Id, data: UpdateData, params?: Params): Promise<Result> {
    // Use patch internally since Wings doesn't have update
    const result = await this.patch(id, data as unknown as PatchData, params)
    return result as Result
  }

  async patch(id: Id, data: PatchData, params?: Params): Promise<Result>
  async patch(id: null, data: PatchData, params?: Params): Promise<Result[]>
  async patch(id: Id | null, data: PatchData, params?: Params): Promise<Result[] | Result> {
    if (id === null) {
      // Bulk operation - delegate to patchMany with allowAll: true
      return this.wingsAdapter.patchMany(data, { ...params, allowAll: true })
    } else {
      // Single operation
      const result = await this.wingsAdapter.patch(id as Primitive, data, params)
      if (result === null) {
        throw new NotFound(`No record found for id '${id}'`)
      }
      return result
    }
  }

  async remove(id: Id, params?: Params): Promise<Result>
  async remove(id: null, params?: Params): Promise<Result[]>
  async remove(id: Id | null, params?: Params): Promise<Result[] | Result> {
    if (id === null) {
      // Bulk operation - delegate to removeMany with allowAll: true
      return this.wingsAdapter.removeMany({ ...params, allowAll: true })
    } else {
      // Single operation
      const result = await this.wingsAdapter.remove(id as Primitive, params)
      if (result === null) {
        throw new NotFound(`No record found for id '${id}'`)
      }
      return result
    }
  }
}

// Export the wrapper as the default export for backwards compatibility
export default FeathersMongodbAdapter
