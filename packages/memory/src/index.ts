import { BadRequest } from '@feathersjs/errors'
import { _ } from '@feathersjs/commons'
import sift from 'sift'
import {
  WingsAdapterInterface,
  AdapterOptions,
  AdapterParams,
  Paginated,
  select,
  sorter,
  Primitive
} from '@wingshq/adapter-commons'

export interface MemoryStore<T> {
  [key: string]: T
}

export interface MemoryOptions<T = any> extends AdapterOptions {
  Model?: MemoryStore<T>
  startId?: number
  matcher?: (query: any) => any
  sorter?: (sort: any) => any
}

export type MemorySettings<T> = Partial<MemoryOptions<T>>

const _select = (data: any, params: any, ...args: string[]) => {
  const base = select(params, ...args)

  return base(JSON.parse(JSON.stringify(data)))
}

// Extended query operators for Wings
export type ExtendedQueryProperty<T> = {
  $in?: T[]
  $nin?: T[]
  $lt?: T
  $lte?: T
  $gt?: T
  $gte?: T
  $ne?: T
  $like?: string
  $notlike?: string
  $ilike?: string
  $isNull?: boolean
}

export type ExtendedQueryProperties<O> = {
  [k in keyof O]?: O[k] | ExtendedQueryProperty<O[k]>
}

export type MemoryQuery<O> = {
  $limit?: number
  $skip?: number
  $select?: (keyof O)[]
  $sort?: { [k in keyof O]?: 1 | -1 }
  $or?: ExtendedQueryProperties<O>[] | readonly ExtendedQueryProperties<O>[]
  $and?: ExtendedQueryProperties<O>[] | readonly ExtendedQueryProperties<O>[]
} & ExtendedQueryProperties<O>

export interface MemoryParams<T> extends AdapterParams<MemoryQuery<T>> {
  Model?: MemoryStore<T>
}

export class MemoryAdapter<
  Result = unknown,
  Data = Partial<Result>,
  PatchData = Partial<Data>,
  Params extends MemoryParams<Result> = MemoryParams<Result>
> implements WingsAdapterInterface<Result, Data, PatchData, MemoryOptions<Result>, Params>
{
  options: MemoryOptions<Result>
  Model: MemoryStore<Result>
  _uId: number

  constructor(options: MemorySettings<Result> = {}) {
    this.options = {
      id: 'id',
      matcher: sift,
      sorter,
      Model: {},
      startId: 0,
      ...options
    }
    this._uId = this.options.startId
    this.Model = { ...this.options.Model }
  }

  get id() {
    return this.options.id
  }

  convertSqlLikeOperators(query: any): any {
    if (!query || typeof query !== 'object') {
      return query
    }

    const converted = { ...query }

    // Convert all keys recursively
    Object.keys(converted).forEach((key) => {
      const value = converted[key]

      if (value && typeof value === 'object') {
        if (Array.isArray(value)) {
          // Handle arrays (like $or, $and)
          converted[key] = value.map((item) => this.convertSqlLikeOperators(item))
        } else {
          // Handle nested objects
          const convertedValue = { ...value }
          Object.keys(convertedValue).forEach((op) => {
            const opValue = convertedValue[op]

            if (op === '$like' && typeof opValue === 'string') {
              delete convertedValue[op]
              // Convert SQL LIKE pattern to regex
              const regexPattern = opValue
                .replace(/([.+*?^${}()|[\]\\])/g, '\\$1') // Escape regex special chars
                .replace(/%/g, '.*') // Convert % to .*
                .replace(/_/g, '.') // Convert _ to .
              convertedValue.$regex = new RegExp(`^${regexPattern}$`)
            } else if (op === '$notlike' && typeof opValue === 'string') {
              delete convertedValue[op]
              // Convert SQL NOT LIKE pattern to not regex
              const regexPattern = opValue
                .replace(/([.+*?^${}()|[\]\\])/g, '\\$1') // Escape regex special chars
                .replace(/%/g, '.*') // Convert % to .*
                .replace(/_/g, '.') // Convert _ to .
              convertedValue.$not = new RegExp(`^${regexPattern}$`)
            } else if (op === '$ilike' && typeof opValue === 'string') {
              delete convertedValue[op]
              // Convert SQL ILIKE pattern to case-insensitive regex
              const regexPattern = opValue
                .replace(/([.+*?^${}()|[\]\\])/g, '\\$1') // Escape regex special chars
                .replace(/%/g, '.*') // Convert % to .*
                .replace(/_/g, '.') // Convert _ to .
              convertedValue.$regex = new RegExp(`^${regexPattern}$`, 'i')
            } else if (op === '$isNull') {
              delete convertedValue[op]
              if (opValue === true) {
                // Find fields that are null or undefined
                convertedValue.$eq = null
              } else if (opValue === false) {
                // Find fields that are not null
                convertedValue.$ne = null
              }
            }
          })
          converted[key] = convertedValue
        }
      }
    })

    return converted
  }

  getQuery(params?: Params) {
    const { $skip, $sort, $limit, $select, ...query } = params?.query || {}

    // Convert SQL-like operators to sift-compatible format
    const convertedQuery = this.convertSqlLikeOperators(query)

    return {
      query: convertedQuery,
      filters: { $skip, $sort, $limit, $select }
    }
  }

  async find(params: Params & { paginate: true }): Promise<Paginated<Result>>
  async find(params?: Params & { paginate?: false }): Promise<Result[]>
  async find(params?: Params & { paginate?: boolean }): Promise<Result[] | Paginated<Result>> {
    const { query, filters } = this.getQuery(params)
    const { Model = this.Model } = params || {}

    let values = _.values(Model).filter(this.options.matcher(query))
    const total = values.length

    if (filters.$sort !== undefined) {
      values.sort(this.options.sorter(filters.$sort))
    }

    if (filters.$skip !== undefined) {
      values = values.slice(filters.$skip)
    }

    if (filters.$limit !== undefined) {
      values = values.slice(0, filters.$limit)
    }

    const data = values.map((value) => _select(value, params, this.id))

    if (params?.paginate) {
      return {
        total,
        limit: filters.$limit || 0,
        skip: filters.$skip || 0,
        data
      }
    }

    return data
  }

  async get(id: Primitive, params?: Params): Promise<Result | null> {
    const { query } = this.getQuery(params)
    const { Model = this.Model } = params || {}
    const modelId = String(id)

    if (modelId in Model) {
      const value = Model[modelId]

      if (this.options.matcher(query)(value)) {
        return _select(value, params, this.id)
      }
    }

    return null
  }

  create(data: Data[], params?: Params): Promise<Result[]>
  create(data: Data, params?: Params): Promise<Result>
  create(data: Data | Data[], params?: Params): Promise<Result[]> | Promise<Result> {
    if (Array.isArray(data)) {
      return Promise.all(data.map((current) => this.create(current, params)))
    }

    const { Model = this.Model } = params || {}
    const id = (data as any)[this.id] || this._uId++
    const current = {
      ...data,
      [this.id]: id
    } as Result

    return _select((Model[id] = current), params, this.id)
  }

  async patch(id: Primitive, data: PatchData, params?: Params): Promise<Result | null> {
    if (id === null || id === undefined) {
      throw new BadRequest('patch() requires a non-null id. Use patchMany() for bulk updates.')
    }

    const { Model = this.Model } = params || {}
    const entry = await this.get(id, params)

    if (!entry) {
      return null
    }

    const currentId = (entry as any)[this.id]
    Model[currentId] = _.extend(Model[currentId], _.omit(data, this.id))

    return _select(Model[currentId], params, this.id)
  }

  async patchMany(data: PatchData, params: Params & { allowAll?: boolean }): Promise<Result[]> {
    if (!params.query && !params.allowAll) {
      throw new BadRequest(
        'No query provided and allowAll is not set. Use allowAll: true to update all records.'
      )
    }

    const { Model = this.Model } = params || {}
    const entries = await this.find({
      ...params,
      paginate: false
    })

    return entries.map((entry) => {
      const currentId = (entry as any)[this.id]
      Model[currentId] = _.extend(Model[currentId], _.omit(data, this.id))
      return _select(Model[currentId], params, this.id)
    })
  }

  async remove(id: Primitive, params?: Params): Promise<Result | null> {
    if (id === null || id === undefined) {
      throw new BadRequest('remove() requires a non-null id. Use removeMany() for bulk removals.')
    }

    const { Model = this.Model } = params || {}
    const entry = await this.get(id, params)

    if (!entry) {
      return null
    }

    const modelId = String(id)
    delete Model[modelId]
    return entry
  }

  async removeMany(params: Params & { allowAll?: boolean }): Promise<Result[]> {
    if (!params.query && !params.allowAll) {
      throw new BadRequest(
        'No query provided and allowAll is not set. Use allowAll: true to remove all records.'
      )
    }

    const { Model = this.Model } = params || {}
    const entries = await this.find({
      ...params,
      paginate: false
    })

    return Promise.all(
      entries.map((current: any) => {
        const id = current[this.id]
        delete Model[id]
        return current
      })
    )
  }

  async removeAll(params?: Params): Promise<Result[]> {
    const { Model = this.Model } = params || {}
    const entries = await this.find({ ...params, paginate: false } as Params & { paginate: false })

    // Clear all entries from the model
    Object.keys(Model).forEach((key) => {
      delete Model[key]
    })

    return entries
  }
}

// Export FeathersJS wrapper for backwards compatibility
export { FeathersMemoryAdapter } from './feathers.js'

// Default export is the Wings adapter
export default MemoryAdapter
