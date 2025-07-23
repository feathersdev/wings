import {
  AdapterOptions,
  AdapterParams,
  AdapterQuery,
  Paginated,
  WingsAdapterInterface,
  Primitive
} from '@wingshq/adapter-commons'
import { GeneralError, BadRequest } from '@feathersjs/errors'
import type {
  Kysely,
  SelectQueryBuilder,
  ExpressionBuilder,
  UpdateQueryBuilder,
  DeleteQueryBuilder
} from 'kysely'

export interface KyselyOptions extends AdapterOptions {
  Model: Kysely<any>
  table: string
  dialect?: 'sqlite' | 'postgres' | 'mysql'
}

export interface KyselyParams extends AdapterParams {
  transaction?: Kysely<any>
}

type QueryBuilder<T> = SelectQueryBuilder<any, string, T>

/**
 * Kysely adapter implementing the Wings interface
 */
export class KyselyAdapter<
  Result = any,
  Data = Partial<Result>,
  PatchData = Partial<Result>,
  Options extends KyselyOptions = KyselyOptions,
  Params extends KyselyParams = KyselyParams
> implements WingsAdapterInterface<Result, Data, PatchData, KyselyOptions, KyselyParams> {
  constructor(public options: Options) {
    if (!options.Model) {
      throw new Error('Kysely adapter: Model option is required')
    }
    if (!options.table) {
      throw new Error('Kysely adapter: table option is required')
    }
  }

  get Model() {
    return this.options.Model
  }

  get table() {
    return this.options.table
  }

  get dialect() {
    return this.options.dialect || 'sqlite'
  }

  get id() {
    return this.options.id || 'id'
  }

  // Get the database instance (supports transactions)
  private getDb(params?: Params): Kysely<any> {
    return (params as any)?.transaction || this.Model
  }

  // Build query with filters
  private buildQuery(query: AdapterQuery = {}, qb: QueryBuilder<Result>): QueryBuilder<Result> {
    let queryBuilder = qb

    // Handle special query operators
    Object.entries(query).forEach(([key, value]) => {
      if (key === '$or' && Array.isArray(value)) {
        queryBuilder = queryBuilder.where((eb: any) => {
          const orConditions = value.map((condition: any) => this.buildCondition(condition, eb))
          return eb.or(orConditions)
        })
      } else if (key === '$and' && Array.isArray(value)) {
        queryBuilder = queryBuilder.where((eb: any) => {
          const andConditions = value.map((condition: any) => this.buildCondition(condition, eb))
          return eb.and(andConditions)
        })
      } else if (!key.startsWith('$')) {
        queryBuilder = this.applyFieldCondition(queryBuilder, key, value)
      }
    })

    return queryBuilder
  }

  // Build condition for $or/$and
  private buildCondition(condition: any, eb: ExpressionBuilder<any, any>): any {
    const conditions: any[] = []

    Object.entries(condition).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // Handle operators
        Object.entries(value).forEach(([op, val]) => {
          conditions.push(this.applyOperator(eb, key, op, val))
        })
      } else {
        // Direct equality
        conditions.push(eb(key, '=', value))
      }
    })

    return conditions.length === 1 ? conditions[0] : eb.and(conditions)
  }

  // Apply operator conditions
  private applyOperator(eb: ExpressionBuilder<any, any>, field: string, operator: string, value: any): any {
    switch (operator) {
      case '$eq':
        return eb(field, '=', value)
      case '$ne':
        return value === null ? eb(field, 'is not', null) : eb(field, '!=', value)
      case '$in':
        return eb(field, 'in', value)
      case '$nin':
        return eb(field, 'not in', value)
      case '$lt':
        return eb(field, '<', value)
      case '$lte':
        return eb(field, '<=', value)
      case '$gt':
        return eb(field, '>', value)
      case '$gte':
        return eb(field, '>=', value)
      case '$like':
        return eb(field, 'like', value)
      case '$notlike':
        return eb(field, 'not like', value)
      case '$ilike':
        // PostgreSQL case-insensitive like
        if (this.dialect === 'postgres') {
          return eb(field, 'ilike', value)
        }
        // Fallback for other databases
        return eb.fn('lower', [field], 'like', eb.fn('lower', [value]))
      case '$isNull':
        return value ? eb(field, 'is', null) : eb(field, 'is not', null)
      default:
        throw new BadRequest(`Unknown operator: ${operator}`)
    }
  }

  // Apply field conditions to query builder
  private applyFieldCondition(qb: QueryBuilder<Result>, field: string, value: any): QueryBuilder<Result> {
    if (value === null) {
      return qb.where(field, 'is', null)
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      // Handle operators
      let builder = qb
      Object.entries(value).forEach(([op, val]) => {
        builder = builder.where((eb: any) => this.applyOperator(eb, field, op, val))
      })
      return builder
    } else {
      // Direct equality
      return qb.where(field, '=', value)
    }
  }

  // Wings Interface Methods (null-safe returns)

  async find(params?: Params & { paginate?: false }): Promise<Result[]>
  async find(params: Params & { paginate: true }): Promise<Paginated<Result>>
  async find(params?: Params): Promise<Result[] | Paginated<Result>> {
    const { query = {} } = (params || {}) as any
    const isPaginated = (params as any)?.paginate === true
    const db = this.getDb(params)

    // Start building the query
    let qb = db.selectFrom(this.table).selectAll()

    // Apply filters (excluding special operators)
    const filters = { ...query }
    delete filters.$limit
    delete filters.$skip
    delete filters.$sort
    delete filters.$select

    qb = this.buildQuery(filters, qb)

    // Apply sorting
    if (query.$sort) {
      Object.entries(query.$sort).forEach(([field, direction]) => {
        qb = qb.orderBy(field, direction === 1 ? 'asc' : 'desc')
      })
    }

    // Apply field selection
    if (query.$select && Array.isArray(query.$select)) {
      qb = db.selectFrom(this.table).select(query.$select as any)
      qb = this.buildQuery(filters, qb)
      if (query.$sort) {
        Object.entries(query.$sort).forEach(([field, direction]) => {
          qb = qb.orderBy(field, direction === 1 ? 'asc' : 'desc')
        })
      }
    }

    if (isPaginated) {
      // Get total count
      const countQuery = db.selectFrom(this.table).select(db.fn.count('*').as('total'))

      const countQb = this.buildQuery(filters, countQuery as any)
      const countResult = await countQb.executeTakeFirst()
      const total = Number(countResult?.total || 0)

      // Apply pagination
      if (query.$skip) {
        qb = qb.offset(query.$skip)
      }
      if (query.$limit) {
        qb = qb.limit(query.$limit)
      }

      const data = (await qb.execute()) as Result[]

      return {
        total,
        limit: query.$limit || 0,
        skip: query.$skip || 0,
        data
      }
    }

    // Apply pagination for non-paginated results
    if (query.$skip) {
      qb = qb.offset(query.$skip)
    }
    if (query.$limit) {
      qb = qb.limit(query.$limit)
    }

    return qb.execute() as Promise<Result[]>
  }

  async get(id: Primitive, params?: Params): Promise<Result | null> {
    const { query = {} } = (params || {}) as any
    const db = this.getDb(params)

    let qb = db.selectFrom(this.table).where(this.id, '=', id)

    // Apply field selection
    if (query.$select && Array.isArray(query.$select)) {
      qb = db
        .selectFrom(this.table)
        .select(query.$select as any)
        .where(this.id, '=', id)
    } else {
      qb = qb.selectAll()
    }

    const result = await qb.executeTakeFirst()
    return result as Result | null
  }

  async create(data: Data[], params?: Params): Promise<Result[]>
  async create(data: Data, params?: Params): Promise<Result>
  async create(data: Data | Data[], params?: Params): Promise<Result[] | Result> {
    const db = this.getDb(params)

    if (Array.isArray(data)) {
      // Bulk create
      if (data.length === 0) {
        return []
      }

      const result = await db
        .insertInto(this.table)
        .values(data as any)
        .returningAll()
        .execute()

      return result as Result[]
    }

    // Single create
    const result = await db
      .insertInto(this.table)
      .values(data as any)
      .returningAll()
      .executeTakeFirst()

    if (!result) {
      throw new GeneralError('Failed to create record')
    }

    return result as Result
  }

  async patch(id: Primitive, data: PatchData, params?: Params): Promise<Result | null> {
    // Wings safety: prevent accidental bulk operations
    if (id === null || id === undefined) {
      throw new BadRequest('patch() requires a non-null id. Use patchMany() for bulk operations.')
    }

    const { query = {} } = (params || {}) as any
    const db = this.getDb(params)

    let qb = db
      .updateTable(this.table)
      .set(data as any)
      .where(this.id, '=', id)

    // Apply additional query conditions
    const filters = { ...query }
    delete filters.$select

    if (Object.keys(filters).length > 0) {
      const updateQb = qb as any as SelectQueryBuilder<any, any, any>
      qb = this.buildQuery(filters, updateQb) as any as UpdateQueryBuilder<any, any, any, any>
    }

    // Apply field selection for return
    if (query.$select && Array.isArray(query.$select)) {
      qb = qb.returning(query.$select as any)
    } else {
      qb = qb.returningAll()
    }

    const result = await qb.executeTakeFirst()
    return result as Result | null
  }

  async patchMany(data: PatchData, params?: Params & { allowAll?: boolean }): Promise<Result[]> {
    const { query = {}, allowAll = false } = (params || {}) as any
    const db = this.getDb(params)

    // Safety check for bulk operations
    const filters = { ...query }
    delete filters.$select
    delete filters.$limit
    delete filters.$skip
    delete filters.$sort

    if (Object.keys(filters).length === 0 && !allowAll) {
      throw new BadRequest('patchMany: No query provided. Use allowAll:true to patch all records')
    }

    let qb = db.updateTable(this.table).set(data as any)

    // Apply filters
    if (Object.keys(filters).length > 0) {
      qb = this.buildQuery(filters, qb as any) as any
    }

    // Apply field selection for return
    if (query.$select && Array.isArray(query.$select)) {
      qb = qb.returning(query.$select as any)
    } else {
      qb = qb.returningAll()
    }

    const result = await qb.execute()
    return result as Result[]
  }

  async remove(id: Primitive, params?: Params): Promise<Result | null> {
    // Wings safety: prevent accidental bulk operations
    if (id === null || id === undefined) {
      throw new BadRequest('remove() requires a non-null id. Use removeMany() for bulk operations.')
    }

    const { query = {} } = (params || {}) as any
    const db = this.getDb(params)

    let qb = db.deleteFrom(this.table).where(this.id, '=', id)

    // Apply additional query conditions
    const filters = { ...query }
    delete filters.$select

    if (Object.keys(filters).length > 0) {
      const deleteQb = qb as any as SelectQueryBuilder<any, any, any>
      qb = this.buildQuery(filters, deleteQb) as any as DeleteQueryBuilder<any, any, any>
    }

    // Apply field selection for return
    if (query.$select && Array.isArray(query.$select)) {
      qb = qb.returning(query.$select as any)
    } else {
      qb = qb.returningAll()
    }

    const result = await qb.executeTakeFirst()
    return result as Result | null
  }

  async removeMany(params?: Params & { allowAll?: boolean }): Promise<Result[]> {
    const { query = {}, allowAll = false } = (params || {}) as any
    const db = this.getDb(params)

    // Safety check for bulk operations
    const filters = { ...query }
    delete filters.$select
    delete filters.$limit
    delete filters.$skip
    delete filters.$sort

    if (Object.keys(filters).length === 0 && !allowAll) {
      throw new BadRequest('removeMany: No query provided. Use allowAll:true to remove all records')
    }

    let qb = db.deleteFrom(this.table)

    // Apply filters
    if (Object.keys(filters).length > 0) {
      qb = this.buildQuery(filters, qb as any) as any
    }

    // Apply field selection for return
    if (query.$select && Array.isArray(query.$select)) {
      qb = qb.returning(query.$select as any)
    } else {
      qb = qb.returningAll()
    }

    const result = await qb.execute()
    return result as Result[]
  }

  async removeAll(): Promise<Result[]> {
    const db = this.getDb()

    const result = await db.deleteFrom(this.table).returningAll().execute()

    return result as Result[]
  }
}
