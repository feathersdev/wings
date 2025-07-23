import {
  ObjectId,
  Collection,
  FindOptions,
  BulkWriteOptions,
  InsertOneOptions,
  DeleteOptions,
  CountDocumentsOptions,
  ReplaceOptions,
  Document,
  MongoError,
  Filter
} from 'mongodb'
import {
  WingsAdapterInterface,
  AdapterOptions,
  AdapterParams,
  AdapterQuery,
  Id,
  Paginated,
  select,
  Primitive
} from '@wingshq/adapter-commons'
import { _ } from '@feathersjs/commons'
import { BadRequest, GeneralError } from '@feathersjs/errors'

export interface MongodbOptions extends AdapterOptions {
  Model: Collection | Promise<Collection>
  disableObjectify?: boolean
  useEstimatedDocumentCount?: boolean
}

export type MongodbSettings = Partial<Omit<MongodbOptions, 'Model'>> & Pick<MongodbOptions, 'Model'>

export type MongodbQuery<T> = Filter<T> & Pick<AdapterQuery<T>, '$select' | '$sort' | '$limit' | '$skip'>

export interface MongodbParams<T> extends AdapterParams<MongodbQuery<T>> {
  Model?: Collection | Promise<Collection>
  pipeline?: Document[]
  mongodb?:
    | BulkWriteOptions
    | FindOptions
    | InsertOneOptions
    | DeleteOptions
    | CountDocumentsOptions
    | ReplaceOptions
}

export type AdapterId = Id | ObjectId

export type NullableAdapterId = AdapterId | null

export function errorHandler(error: MongoError): any {
  // See https://github.com/mongodb/mongo/blob/master/docs/errors.md
  if (error && error.name && error.name.startsWith('Mongo')) {
    throw new GeneralError(error, {
      name: error.name,
      code: error.code
    })
  }

  throw error
}

export class MongodbAdapter<
  Result = unknown,
  Data = Partial<Result>,
  PatchData = Partial<Data>,
  Params extends MongodbParams<Result> = MongodbParams<Result>
> implements WingsAdapterInterface<Result, Data, PatchData, MongodbOptions, Params>
{
  options: MongodbOptions

  constructor(settings: MongodbSettings) {
    this.options = {
      id: '_id',
      ...settings
    }
  }

  get id() {
    return this.options.id
  }

  getModel(params?: Params) {
    return Promise.resolve(params?.Model || this.options.Model)
  }

  getObjectId(id: AdapterId) {
    if (this.options.disableObjectify) {
      return id
    }

    if (this.id === '_id' && ObjectId.isValid(id)) {
      id = new ObjectId(id.toString())
    }

    return id
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
        // Skip RegExp objects - they should be passed through unchanged
        if (value instanceof RegExp) {
          return
        }

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
              // Convert SQL LIKE pattern to MongoDB regex
              const regexPattern = opValue
                .replace(/([.+*?^${}()|[\]\\])/g, '\\$1') // Escape regex special chars
                .replace(/%/g, '.*') // Convert % to .*
                .replace(/_/g, '.') // Convert _ to .
              convertedValue.$regex = new RegExp(`^${regexPattern}$`, 'i')
            } else if (op === '$notlike' && typeof opValue === 'string') {
              delete convertedValue[op]
              // Convert SQL NOT LIKE pattern to MongoDB not regex
              const regexPattern = opValue
                .replace(/([.+*?^${}()|[\]\\])/g, '\\$1') // Escape regex special chars
                .replace(/%/g, '.*') // Convert % to .*
                .replace(/_/g, '.') // Convert _ to .
              convertedValue.$not = { $regex: new RegExp(`^${regexPattern}$`, 'i') }
            } else if (op === '$ilike' && typeof opValue === 'string') {
              delete convertedValue[op]
              // Convert SQL ILIKE pattern to MongoDB case-insensitive regex
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
                // Find fields that are not null and exist
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

  filterQuery(id: AdapterId | null, params?: Params) {
    const { $select, $sort, $limit, $skip = 0, ..._query } = (params?.query || {}) as AdapterQuery<Result>
    const query = this.convertSqlLikeOperators(_query) as { [key: string]: any }

    if (id !== null) {
      query.$and = (query.$and || []).concat({
        [this.id]: this.getObjectId(id)
      })
    }

    if (query[this.id]) {
      query[this.id] = this.getObjectId(query[this.id])
    }

    return {
      filters: { $select, $sort, $limit, $skip },
      query
    }
  }

  async findRaw(params?: Params) {
    const { filters, query } = this.filterQuery(null, params)
    const model = await this.getModel(params)
    const q = model.find(query, { ...params?.mongodb })

    if (filters.$select !== undefined) {
      q.project(this.getSelect(filters.$select))
    }

    if (filters.$sort !== undefined) {
      q.sort(filters.$sort)
    }

    if (filters.$skip !== undefined) {
      q.skip(filters.$skip)
    }

    if (filters.$limit !== undefined) {
      q.limit(filters.$limit)
    }

    return q
  }

  async aggregateRaw(params?: Params) {
    const model = await this.getModel(params)
    const pipeline = params?.pipeline || []

    // Build the final pipeline
    const finalPipeline: Document[] = []
    let feathersPipelineInserted = false

    for (let i = 0; i < pipeline.length; i++) {
      const stage = pipeline[i]

      // Skip all $feathers and $wings stages
      if (stage.$feathers || stage.$wings) {
        // Insert feathers pipeline at the first occurrence only
        if (!feathersPipelineInserted) {
          finalPipeline.push(...this.makeFeathersPipeline(params))
          feathersPipelineInserted = true
        }
        continue
      }

      finalPipeline.push(stage)
    }

    // If no $feathers or $wings stage was found, prepend the feathers pipeline
    if (!feathersPipelineInserted) {
      const feathersPipeline = this.makeFeathersPipeline(params)
      return model.aggregate([...feathersPipeline, ...finalPipeline])
    }

    return model.aggregate(finalPipeline)
  }

  // Creates the pipeline stages for Wings/Feathers query parameters
  // Used when $wings or $feathers stage is specified in aggregation pipeline
  makeFeathersPipeline(params?: Params) {
    const { filters, query } = this.filterQuery(null, params)
    const pipeline: Document[] = [{ $match: query }]

    if (filters.$select !== undefined) {
      pipeline.push({ $project: this.getSelect(filters.$select) })
    }

    if (filters.$sort !== undefined) {
      pipeline.push({ $sort: filters.$sort })
    }

    if (filters.$skip !== undefined) {
      pipeline.push({ $skip: filters.$skip })
    }

    if (filters.$limit !== undefined) {
      pipeline.push({ $limit: filters.$limit })
    }
    return pipeline
  }

  getSelect(_select: (keyof Result)[] | { [key: string]: number }) {
    const select = Array.isArray(_select)
      ? _select.reduce<{ [key: string]: number }>(
          (value, name) => ({
            ...value,
            [name]: 1
          }),
          {}
        )
      : _select

    if (!select[this.id]) {
      return {
        ...select,
        [this.id]: 1
      }
    }

    return select
  }

  async _findOrGet(id: NullableAdapterId, params?: Params) {
    return id === null ? await this.find(params) : await this.get(id as Primitive, params)
  }

  normalizeId<D>(id: NullableAdapterId, data: D): D {
    if (this.id === '_id') {
      // Default Mongo IDs cannot be updated. The Mongo library handles
      // this automatically.
      return _.omit(data, this.id)
    } else if (id !== null) {
      // If not using the default Mongo _id field set the ID to its
      // previous value. This prevents orphaned documents.
      return {
        ...data,
        [this.id]: id
      }
    }
    return data
  }

  async find(params?: Params & { paginate?: false }): Promise<Result[]>
  async find(params: Params & { paginate: true }): Promise<Paginated<Result>>
  async find(params?: Params & { paginate?: boolean }): Promise<Result[] | Paginated<Result>> {
    const { filters, query } = this.filterQuery(null, params)
    const useAggregation = params?.pipeline || (!params?.mongodb && filters.$limit !== 0)
    const countDocuments = async () => {
      if (params?.paginate) {
        const model = await this.getModel(params)
        let count: any
        if (this.options.useEstimatedDocumentCount && typeof model.estimatedDocumentCount === 'function') {
          count = await model.estimatedDocumentCount()
        } else {
          count = await model.countDocuments(query, { ...params?.mongodb })
        }
        // Ensure we return a plain number, not a MongoDB Long or other type
        return typeof count === 'object' && count !== null && 'toNumber' in count
          ? count.toNumber()
          : Number(count)
      }
      return Promise.resolve(0)
    }

    const [request, total] = await Promise.all([
      useAggregation ? this.aggregateRaw(params) : this.findRaw(params),
      countDocuments()
    ])
    const data = filters.$limit === 0 ? [] : ((await request.toArray()) as any as Result[])

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
    const {
      query,
      filters: { $select }
    } = this.filterQuery(id as AdapterId, params)
    const projection = $select
      ? {
          projection: {
            ...this.getSelect($select),
            [this.id]: 1
          }
        }
      : {}
    const findOptions: FindOptions = {
      ...params?.mongodb,
      ...projection
    }

    return this.getModel(params)
      .then((model) => model.findOne(query, findOptions))
      .then((data) => {
        if (data == null) {
          return null
        }

        return data
      })
      .catch(errorHandler)
  }

  async create(data: Data[], params?: Params): Promise<Result[]>
  async create(data: Data, params?: Params): Promise<Result>
  async create(data: Data | Data[], params?: Params): Promise<Result[] | Result> {
    const writeOptions = params?.mongodb
    const model = await this.getModel(params)
    const setId = (item: any) => {
      const entry = Object.assign({}, item)

      // Generate a MongoId if we use a custom id
      if (this.id !== '_id' && typeof entry[this.id] === 'undefined') {
        return {
          [this.id]: new ObjectId().toHexString(),
          ...entry
        }
      }

      return entry
    }

    const promise = Array.isArray(data)
      ? model
          .insertMany(data.map(setId), writeOptions)
          .then(async (result) =>
            model.find({ _id: { $in: Object.values(result.insertedIds) } }, params?.mongodb).toArray()
          )
      : model
          .insertOne(setId(data), writeOptions)
          .then(async (result) => model.findOne({ _id: result.insertedId }, params?.mongodb))

    return promise.then(select(params, this.id)).catch(errorHandler)
  }

  async patch(id: Primitive, data: PatchData, params?: Params): Promise<Result | null> {
    if (id === null || id === undefined) {
      throw new BadRequest('patch() requires a non-null id. Use patchMany() for bulk updates.')
    }
    return this._patchSingle(id as Id, data, params)
  }

  private async _patchSingle(id: Id, _data: PatchData, params?: Params): Promise<Result | null> {
    const data = this.normalizeId(id, _data)
    const model = await this.getModel(params)
    const {
      query,
      filters: { $select }
    } = this.filterQuery(id, params)
    const updateOptions = { ...params?.mongodb }
    const modifier = Object.keys(data).reduce((current, key) => {
      const value = (data as any)[key]

      if (key.charAt(0) !== '$') {
        current.$set = {
          ...current.$set,
          [key]: value
        }
      } else {
        current[key] = value
      }

      return current
    }, {} as any)

    // First, let's get the existing document to make sure it exists and matches the query
    const existingDoc = await model.findOne(query)
    if (!existingDoc) {
      return null
    }

    // Update the document
    await model.updateOne(query, modifier, updateOptions)

    // Get the updated document with proper field selection
    const projection = $select
      ? {
          projection: {
            ...this.getSelect($select),
            [this.id]: 1
          }
        }
      : {}

    const updatedDoc = await model.findOne({ [this.id]: existingDoc[this.id] }, projection)
    return updatedDoc as Result
  }

  async patchMany(data: PatchData, params: Params & { allowAll?: boolean }): Promise<Result[]> {
    if (!params.query && !params.allowAll) {
      throw new BadRequest(
        'No query provided and allowAll is not set. Use allowAll: true to update all records.'
      )
    }

    const normalizedData = this.normalizeId(null, data)
    const model = await this.getModel(params)
    const {
      query,
      filters: { $select }
    } = this.filterQuery(null, params)
    const updateOptions = { ...params?.mongodb }
    const modifier = Object.keys(normalizedData).reduce((current, key) => {
      const value = (normalizedData as any)[key]

      if (key.charAt(0) !== '$') {
        current.$set = {
          ...current.$set,
          [key]: value
        }
      } else {
        current[key] = value
      }

      return current
    }, {} as any)

    // Get items that will be updated
    const originalItems = await this.find({
      ...params,
      query: {
        ...query,
        $select: [this.id]
      },
      paginate: false
    })
    const idList = originalItems.map((item: any) => item[this.id])

    await model.updateMany(query, modifier, updateOptions)

    // Return updated items
    return this.find({
      ...params,
      query: {
        [this.id]: { $in: idList },
        $select
      },
      paginate: false
    }).catch(errorHandler)
  }

  async remove(id: Primitive, params?: Params): Promise<Result | null> {
    if (id === null || id === undefined) {
      throw new BadRequest('remove() requires a non-null id. Use removeMany() for bulk removals.')
    }
    return this._removeSingle(id as Id, params)
  }

  private async _removeSingle(id: Id, params?: Params): Promise<Result | null> {
    const model = await this.getModel(params)
    const {
      query,
      filters: { $select }
    } = this.filterQuery(id, params)
    const deleteOptions = { ...params?.mongodb }

    // Get the document that will be deleted (with proper field selection)
    const projection = $select
      ? {
          projection: {
            ...this.getSelect($select),
            [this.id]: 1
          }
        }
      : {}

    const item = await model.findOne(query, projection)
    if (!item) {
      return null
    }

    // Delete the document
    await model.deleteOne(query, deleteOptions)
    return item as Result
  }

  async removeMany(params: Params & { allowAll?: boolean }): Promise<Result[]> {
    if (!params.query && !params.allowAll) {
      throw new BadRequest(
        'No query provided and allowAll is not set. Use allowAll: true to remove all records.'
      )
    }

    const model = await this.getModel(params)
    const {
      query,
      filters: { $select }
    } = this.filterQuery(null, params)
    const deleteOptions = { ...params?.mongodb }
    const findParams = {
      ...params,
      paginate: false,
      query: {
        ...query,
        $select
      }
    }

    // Get items that will be removed
    const items = await this.find(findParams as Params & { paginate: false })
    await model.deleteMany(query, deleteOptions)
    return items
  }

  async removeAll(params?: Params): Promise<Result[]> {
    const model = await this.getModel(params)
    const deleteOptions = { ...params?.mongodb }

    // Get all items first
    const items = await this.find({ ...params, paginate: false } as Params & { paginate: false })
    await model.deleteMany({}, deleteOptions)
    return items
  }
}

// Export FeathersJS wrapper for backwards compatibility
export { FeathersMongodbAdapter } from './feathers.js'

// Default export is the Wings adapter
export default MongodbAdapter
