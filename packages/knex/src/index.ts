import {
  AdapterOptions,
  AdapterParams,
  AdapterQuery,
  Primitive,
  Paginated,
  AdapterBase
} from '@wingshq/adapter-commons'
import { _ } from '@feathersjs/commons'
import { Knex } from 'knex'
import { errorHandler } from './error-handler'
import { extractCountValue, safeQueryExecution, createFullTableName } from './utils'
import { validateAdapterSettings } from './validation'
import {
  handleSpecialOperators,
  handleComplexOperators,
  QUERY_OPERATORS,
  QUERY_METHODS
} from './query-operators'
import {
  findItemsForBulkOperation,
  executeBulkUpdate,
  executeBulkDelete,
  BulkOperationHelpers
} from './bulk-operations'

export * from './error-handler'

export interface KnexOptions extends AdapterOptions {
  Model: Knex
  name: string
  schema?: string
}

export type KnexSettings = Omit<KnexOptions, 'id'> & { id?: string }

export interface KnexParams<T = AdapterQuery<any>> extends AdapterParams<T> {
  Model?: Knex
  name?: string
  schema?: string
  knex?: Knex.QueryBuilder
  transaction?: Knex.Transaction
  paginate?: boolean
}

const RETURNING_CLIENTS = ['postgresql', 'pg', 'oracledb', 'mssql']

export class KnexAdapter<T extends Record<string, any> = any>
  extends AdapterBase<T, Partial<T>, Partial<T>, KnexOptions, KnexParams>
  implements BulkOperationHelpers<T>
{
  constructor(settings: KnexSettings) {
    validateAdapterSettings(settings)
    super(settings)
  }

  get fullName() {
    const { name, schema } = this.getOptions()
    return createFullTableName(name, schema)
  }

  getOptions(params?: KnexParams): KnexOptions {
    return {
      ...this.options,
      ...params
    }
  }

  getModel(params?: KnexParams) {
    const { Model } = this.getOptions(params)
    return Model
  }

  db(params?: KnexParams) {
    const { Model, name, schema } = this.getOptions(params)

    if (params?.transaction) {
      const trx = params.transaction
      // debug('ran %s with transaction %s', fullName, id)
      return schema ? (trx.withSchema(schema).table(name) as Knex.QueryBuilder) : trx(name)
    }

    return schema ? (Model.withSchema(schema).table(name) as Knex.QueryBuilder) : Model(name)
  }

  knexify(
    knexQuery: Knex.QueryBuilder,
    query: { [key: string]: any } = {},
    parentKey?: string
  ): Knex.QueryBuilder {
    return Object.keys(query || {}).reduce((currentQuery, key) => {
      const value = query[key]

      if (_.isObject(value)) {
        return this.knexify(currentQuery, value, key)
      }

      const column = parentKey || key

      // Try special operators first
      const specialResult = handleSpecialOperators(currentQuery, key, value, column)
      if (specialResult) return specialResult

      // Try complex operators ($or, $and, etc.)
      const complexResult = handleComplexOperators(currentQuery, key, value, (builder, condition) =>
        this.knexify(builder, condition)
      )
      if (complexResult) return complexResult

      // Handle standard method operators
      const method = QUERY_METHODS[key as keyof typeof QUERY_METHODS]
      if (method) {
        return (currentQuery as any)[method](column, value)
      }

      // Handle standard comparison operators
      const operator = QUERY_OPERATORS[key as keyof typeof QUERY_OPERATORS] || '='
      return operator === '='
        ? currentQuery.where(column, value)
        : currentQuery.where(column, operator, value)
    }, knexQuery)
  }

  createQuery(params?: KnexParams) {
    const { name, id } = this.getOptions(params)
    const { filters, query } = this.filterQuery(params)
    const builder = this.db(params)

    this.applySelect(builder, filters.$select, name, id)
    this.knexify(builder, { ...query, ..._.pick(filters, '$and', '$or') })
    this.applySort(builder, filters.$sort)

    return builder
  }

  private applySelect(builder: Knex.QueryBuilder, select: string[] | undefined, name: string, id: string) {
    if (select) {
      const selectFields = select.map((column) =>
        String(column).includes('.') ? String(column) : `${name}.${String(column)}`
      )
      builder.select(...Array.from(new Set([...selectFields, `${name}.${id}`])))
    } else {
      builder.select(`${name}.*`)
    }
  }

  private applySort(builder: Knex.QueryBuilder, sort: any) {
    if (sort) {
      Object.keys(sort).forEach((key) => {
        builder.orderBy(key, sort[key] === 1 ? 'asc' : 'desc')
      })
    }
  }

  async find(params: KnexParams & { paginate: true }): Promise<Paginated<T>>
  async find(params?: KnexParams & { paginate?: false }): Promise<T[]>
  async find(params?: KnexParams): Promise<T[] | Paginated<T>> {
    const { name, id } = this.getOptions(params)
    const { filters } = this.filterQuery(params)
    const builder = this.createQuery(params)
    const paginate = params?.paginate

    if (filters.$limit) {
      builder.limit(filters.$limit)
    }

    if (filters.$skip) {
      builder.offset(filters.$skip)
    }

    if (!filters.$sort && builder.client.driverName === 'mssql') {
      builder.orderBy(`${name}.${id}`, 'asc')
    }

    const data = filters.$limit === 0 ? [] : await safeQueryExecution<T[]>(builder, errorHandler)

    if (paginate) {
      const total = await this.getCount(builder, name, id)
      return this.buildPaginatedResult(data, total, filters)
    }

    return data
  }

  private async getCount(builder: Knex.QueryBuilder, name: string, id: string): Promise<number> {
    const countBuilder = builder.clone().clearSelect().clearOrder().count(`${name}.${id} as total`)
    // Clear any existing limit/offset that would affect the count
    countBuilder.clear('limit').clear('offset')
    const countResult = await safeQueryExecution<any[]>(countBuilder, errorHandler)
    return extractCountValue(countResult)
  }

  async get(id: Primitive, params?: KnexParams): Promise<T | null> {
    const { name, id: idField } = this.getOptions(params)
    const builder = params?.knex ? params.knex.clone() : this.createQuery(params)
    const data = await safeQueryExecution<T[]>(builder.andWhere(`${name}.${idField}`, '=', id), errorHandler)
    return data.length === 1 ? data[0] : null
  }

  async create(data: Partial<T>[], params?: KnexParams): Promise<T[]>
  async create(data: Partial<T>, params?: KnexParams): Promise<T>
  async create(_data: Partial<T> | Partial<T>[], params?: KnexParams): Promise<T[] | T> {
    if (Array.isArray(_data)) {
      return Promise.all(_data.map((current: Partial<T>) => this.create(current, params)))
    }

    const data = _data as Partial<T>
    const db = this.db(params)
    const { client } = db.client.config
    const supportsReturning = RETURNING_CLIENTS.includes(client as string)

    if (supportsReturning) {
      const rows: any = await safeQueryExecution(db.insert(data, [this.id]), errorHandler)
      const id = data[this.id as keyof T] || rows[0]?.[this.id] || rows[0]
      if (!id) return rows as T[]

      const result = await this.get(id, {
        ...params,
        query: _.pick(params?.query || {}, '$select')
      })
      return result as T
    } else {
      // MySQL doesn't support RETURNING
      const result: any = await safeQueryExecution(db.insert(data), errorHandler)
      const insertId = Array.isArray(result) ? result[0] : result

      // Use provided id or auto-generated id
      const id = data[this.id as keyof T] || insertId
      if (!id) {
        throw new Error('Failed to get insert ID')
      }

      const record = await this.get(id, {
        ...params,
        query: _.pick(params?.query || {}, '$select')
      })
      return record as T
    }
  }

  async patch(id: Primitive, data: Partial<T>, params?: KnexParams): Promise<T | null> {
    this.validateNonNullId(id, 'patch')

    const { name, id: idField } = this.getOptions(params)
    const patchData = _.omit(data, this.id)

    // Build update query with id and any query constraints
    const updateBuilder = this.db(params).where(`${name}.${idField}`, id)
    if (params?.query) {
      const { query } = this.filterQuery(params)
      this.knexify(updateBuilder, query)
    }

    const updateResult = await safeQueryExecution(updateBuilder.update(patchData), errorHandler)
    if (updateResult === 0) {
      return null
    }

    // When getting the updated record, preserve $select but remove other query constraints
    const selectOnlyParams = params?.query?.$select ? { query: { $select: params.query.$select } } : undefined
    return this.get(id, selectOnlyParams)
  }

  async patchMany(data: Partial<T>, params: KnexParams & { allowAll?: boolean }): Promise<T[]> {
    this.validateBulkParams(params.query, params.allowAll, 'update')

    const { items: _items, idList } = await findItemsForBulkOperation(this, params)
    if (idList.length === 0) return []

    const patchData = _.omit(data, this.id)
    return executeBulkUpdate(this, patchData, params, idList)
  }

  async remove(id: Primitive, params?: KnexParams): Promise<T | null> {
    this.validateNonNullId(id, 'remove')

    const existing = await this.get(id, params)
    if (!existing) return null

    const { name, id: idField } = this.getOptions(params)
    await safeQueryExecution(this.db(params).where(`${name}.${idField}`, id).del(), errorHandler)
    return existing
  }

  async removeMany(params: KnexParams & { allowAll?: boolean }): Promise<T[]> {
    this.validateBulkParams(params.query, params.allowAll, 'remove')

    const { items } = await findItemsForBulkOperation(this, params)
    if (items.length === 0) return []

    return executeBulkDelete(this, params, items)
  }

  async removeAll(params?: KnexParams): Promise<T[]> {
    const items = await this.find({ ...params, paginate: false })
    if (items.length === 0) return []

    return executeBulkDelete(this, params || {}, items)
  }
}
