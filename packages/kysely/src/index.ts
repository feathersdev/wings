import {
  AdapterOptions,
  AdapterParams,
  AdapterQuery,
  Paginated,
  WingsAdapterInterface,
  Primitive
} from '@wingshq/adapter-commons'
import { GeneralError, BadRequest } from '@feathersjs/errors'
import { Kysely, SelectQueryBuilder, ExpressionBuilder, sql } from 'kysely'

export interface KyselyOptions<DB = any> extends AdapterOptions {
  Model: Kysely<DB>
  table: keyof DB & string
  dialect?: 'sqlite' | 'postgres' | 'mysql'
  // Performance options
  debug?: boolean
  // Cache frequently used query builders
  cacheQueries?: boolean
  // Batch size for bulk operations
  batchSize?: number
}

export interface KyselyParams extends AdapterParams<AdapterQuery<any>> {
  transaction?: Kysely<any>
}

// Remove unused type alias

/**
 * Kysely adapter implementing the Wings interface
 */
export class KyselyAdapter<
  Result = any,
  Data = Partial<Result>,
  PatchData = Partial<Result>,
  Options extends KyselyOptions = KyselyOptions,
  Params extends KyselyParams = KyselyParams
> implements WingsAdapterInterface<Result, Data, PatchData, KyselyOptions, KyselyParams>
{
  // Future: implement query caching
  // private queryCache: Map<string, any> = new Map()

  constructor(public options: Options) {
    if (!options.Model) {
      throw new Error('Kysely adapter: Model option is required')
    }
    if (!options.table) {
      throw new Error('Kysely adapter: table option is required')
    }

    // Enable query logging if debug is true
    if (options.debug) {
      this.enableQueryLogging()
    }
  }

  private enableQueryLogging() {
    // Note: In a real implementation, you'd hook into Kysely's query logging
    // This is a placeholder for the concept
    console.log(`[Kysely Adapter] Debug mode enabled for table: ${this.table}`)
  }

  // Validate and sanitize query operators
  private validateQueryOperator(operator: string): void {
    const validOperators = [
      '$eq',
      '$ne',
      '$in',
      '$nin',
      '$lt',
      '$lte',
      '$gt',
      '$gte',
      '$like',
      '$notlike',
      '$ilike',
      '$isNull',
      '$or',
      '$and'
    ]

    if (!validOperators.includes(operator)) {
      throw new BadRequest(
        `Invalid query operator: ${operator}. Valid operators are: ${validOperators.join(', ')}`
      )
    }
  }

  // Handle database-specific errors
  private handleDatabaseError(error: any, operation: string): never {
    const message = error.message || 'Unknown database error'

    // Check for common constraint violations
    if (
      message.includes('UNIQUE constraint failed') ||
      message.includes('duplicate key') ||
      message.includes('Duplicate entry')
    ) {
      throw new BadRequest(`Duplicate key error in ${operation}: ${message}`)
    }

    if (message.includes('FOREIGN KEY constraint failed') || message.includes('foreign key constraint')) {
      throw new BadRequest(`Foreign key constraint error in ${operation}: ${message}`)
    }

    if (message.includes('NOT NULL constraint failed') || message.includes('cannot be null')) {
      throw new BadRequest(`Required field missing in ${operation}: ${message}`)
    }

    // Default to general error
    throw new GeneralError(`Database error during ${operation}: ${message}`)
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

  get supportsReturning() {
    return this.dialect !== 'mysql'
  }

  get id() {
    return this.options.id || 'id'
  }

  // Convert boolean values to integers for SQLite
  private convertBooleansForSQLite(data: any): any {
    if (this.dialect !== 'sqlite' || !data || typeof data !== 'object') {
      return data
    }

    // Early return if no boolean values found
    let hasBooleans = false
    for (const key in data) {
      if (typeof data[key] === 'boolean') {
        hasBooleans = true
        break
      }
    }

    if (!hasBooleans) {
      return data
    }

    const converted = { ...data }
    for (const key in converted) {
      if (typeof converted[key] === 'boolean') {
        converted[key] = converted[key] ? 1 : 0
      }
    }
    return converted
  }

  // Get the database instance (supports transactions)
  private getDb(params?: Params): Kysely<any> {
    return (params as any)?.transaction || this.Model
  }

  // Build query with filters
  private buildQuery(
    query: AdapterQuery<any> = {},
    qb: SelectQueryBuilder<any, any, any>
  ): SelectQueryBuilder<any, any, any> {
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

  // Optimized count query builder (no sorting or field selection needed)
  private buildCountQuery(
    query: AdapterQuery<any> = {},
    qb: SelectQueryBuilder<any, any, any>
  ): SelectQueryBuilder<any, any, any> {
    // Reuse buildQuery but skip non-filter operations
    return this.buildQuery(query, qb)
  }

  // Build condition for $or/$and
  private buildCondition(condition: any, eb: ExpressionBuilder<any, any>): any {
    const conditions: any[] = []

    Object.entries(condition).forEach(([key, value]) => {
      if (key === '$or' && Array.isArray(value)) {
        // Handle nested $or
        const orConditions = value.map((cond: any) => this.buildCondition(cond, eb))
        conditions.push(eb.or(orConditions))
      } else if (key === '$and' && Array.isArray(value)) {
        // Handle nested $and
        const andConditions = value.map((cond: any) => this.buildCondition(cond, eb))
        conditions.push(eb.and(andConditions))
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // Handle operators
        Object.entries(value).forEach(([op, val]) => {
          conditions.push(this.applyOperator(eb, key, op, val))
        })
      } else if (value === null) {
        // Handle null values
        conditions.push(eb(key, 'is', null))
      } else {
        // Direct equality
        // Convert boolean values for SQLite
        let queryValue = value
        if (this.dialect === 'sqlite' && typeof value === 'boolean') {
          queryValue = value ? 1 : 0
        }
        conditions.push(eb(key, '=', queryValue))
      }
    })

    return conditions.length === 1 ? conditions[0] : eb.and(conditions)
  }

  // Apply operator conditions
  private applyOperator(eb: ExpressionBuilder<any, any>, field: string, operator: string, value: any): any {
    // Convert boolean values for SQLite
    let queryValue = value
    if (this.dialect === 'sqlite' && typeof value === 'boolean') {
      queryValue = value ? 1 : 0
    }

    switch (operator) {
      case '$eq':
        return eb(field, '=', queryValue)
      case '$ne':
        return value === null ? eb(field, 'is not', null) : eb(field, '!=', queryValue)
      case '$in':
        // Convert boolean values in arrays for SQLite
        if (this.dialect === 'sqlite' && Array.isArray(value)) {
          const convertedArray = value.map((v) => (typeof v === 'boolean' ? (v ? 1 : 0) : v))
          return eb(field, 'in', convertedArray)
        }
        return eb(field, 'in', value)
      case '$nin':
        // Convert boolean values in arrays for SQLite
        if (this.dialect === 'sqlite' && Array.isArray(value)) {
          const convertedArray = value.map((v) => (typeof v === 'boolean' ? (v ? 1 : 0) : v))
          return eb(field, 'not in', convertedArray)
        }
        return eb(field, 'not in', value)
      case '$lt':
        return eb(field, '<', queryValue)
      case '$lte':
        return eb(field, '<=', queryValue)
      case '$gt':
        return eb(field, '>', queryValue)
      case '$gte':
        return eb(field, '>=', queryValue)
      case '$like':
        return eb(field, 'like', queryValue)
      case '$notlike':
        return eb(field, 'not like', queryValue)
      case '$ilike':
        // PostgreSQL case-insensitive like
        if (this.dialect === 'postgres') {
          return eb(field, 'ilike', value)
        }
        // Fallback for other databases
        // For SQLite and other databases, use case-insensitive comparison
        return eb.and([sql`lower(${sql.ref(field)}) like lower(${value})`])
      case '$isNull':
        return value ? eb(field, 'is', null) : eb(field, 'is not', null)
      default:
        this.validateQueryOperator(operator)
        // This line should never be reached due to validateQueryOperator throwing
        throw new BadRequest(`Unknown operator: ${operator}`)
    }
  }

  // Apply field conditions to query builder
  private applyFieldCondition(
    qb: SelectQueryBuilder<any, any, any>,
    field: string,
    value: any
  ): SelectQueryBuilder<any, any, any> {
    // Convert boolean values for SQLite
    let queryValue = value
    if (this.dialect === 'sqlite' && typeof value === 'boolean') {
      queryValue = value ? 1 : 0
    }

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
      return qb.where(field, '=', queryValue)
    }
  }

  // Apply where conditions to any query builder (select, update, delete)
  private applyWhereConditions(qb: any, filters: any): any {
    Object.entries(filters).forEach(([key, value]) => {
      if (key === '$or' && Array.isArray(value)) {
        qb = qb.where((eb: any) => {
          const orConditions = value.map((condition: any) => this.buildCondition(condition, eb))
          return eb.or(orConditions)
        })
      } else if (key === '$and' && Array.isArray(value)) {
        qb = qb.where((eb: any) => {
          const andConditions = value.map((condition: any) => this.buildCondition(condition, eb))
          return eb.and(andConditions)
        })
      } else if (!key.startsWith('$')) {
        // Convert boolean values for SQLite
        let queryValue = value
        if (this.dialect === 'sqlite' && typeof value === 'boolean') {
          queryValue = value ? 1 : 0
        }

        if (value === null) {
          qb = qb.where(key, 'is', null)
        } else if (typeof value === 'object' && !Array.isArray(value)) {
          // Handle operators
          Object.entries(value).forEach(([op, val]) => {
            // Convert boolean values for SQLite
            let opValue = val
            if (this.dialect === 'sqlite' && typeof val === 'boolean') {
              opValue = val ? 1 : 0
            }

            switch (op) {
              case '$eq':
                qb = qb.where(key, '=', opValue)
                break
              case '$ne':
                qb = val === null ? qb.where(key, 'is not', null) : qb.where(key, '!=', opValue)
                break
              case '$in':
                // Convert boolean values in arrays for SQLite
                if (this.dialect === 'sqlite' && Array.isArray(val)) {
                  const convertedArray = val.map((v) => (typeof v === 'boolean' ? (v ? 1 : 0) : v))
                  qb = qb.where(key, 'in', convertedArray)
                } else {
                  qb = qb.where(key, 'in', val)
                }
                break
              case '$nin':
                // Convert boolean values in arrays for SQLite
                if (this.dialect === 'sqlite' && Array.isArray(val)) {
                  const convertedArray = val.map((v) => (typeof v === 'boolean' ? (v ? 1 : 0) : v))
                  qb = qb.where(key, 'not in', convertedArray)
                } else {
                  qb = qb.where(key, 'not in', val)
                }
                break
              case '$lt':
                qb = qb.where(key, '<', opValue)
                break
              case '$lte':
                qb = qb.where(key, '<=', opValue)
                break
              case '$gt':
                qb = qb.where(key, '>', opValue)
                break
              case '$gte':
                qb = qb.where(key, '>=', opValue)
                break
              case '$like':
                qb = qb.where(key, 'like', val)
                break
              case '$notlike':
                qb = qb.where(key, 'not like', val)
                break
              case '$ilike':
                // PostgreSQL case-insensitive like
                if (this.dialect === 'postgres') {
                  qb = qb.where(key, 'ilike', val)
                } else {
                  // For SQLite and other databases, use case-insensitive comparison
                  qb = qb.where(sql`lower(${sql.ref(key)}) like lower(${val})`)
                }
                break
              case '$isNull':
                qb = val ? qb.where(key, 'is', null) : qb.where(key, 'is not', null)
                break
              default:
                throw new BadRequest(`Unknown operator: ${op}`)
            }
          })
        } else {
          qb = qb.where(key, '=', queryValue)
        }
      }
    })
    return qb
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
      // Always include the id field
      const fieldsToSelect = query.$select.includes(this.id) ? query.$select : [this.id, ...query.$select]
      qb = qb.clearSelect().select(fieldsToSelect as any)
    }

    if (isPaginated) {
      // Get total count - optimize by not including unnecessary joins or selects
      const countQuery = db.selectFrom(this.table).select(sql<number>`count(*)`.as('total'))

      // Build count query with only WHERE conditions (no sorting or field selection needed)
      const countQb = this.buildCountQuery(filters, countQuery as any)
      const countResult = (await countQb.executeTakeFirst()) as { total: number | string } | undefined
      const total = Number(countResult?.total) || 0

      // Apply pagination
      // SQLite requires LIMIT when using OFFSET
      if (query.$skip || query.$limit) {
        if (query.$limit) {
          qb = qb.limit(query.$limit)
        } else if (query.$skip) {
          // SQLite needs a limit when using offset, so use a very large number
          qb = qb.limit(Number.MAX_SAFE_INTEGER)
        }
        if (query.$skip) {
          qb = qb.offset(query.$skip)
        }
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
    // SQLite requires LIMIT when using OFFSET
    if (query.$skip || query.$limit) {
      if (query.$limit) {
        qb = qb.limit(query.$limit)
      } else if (query.$skip) {
        // SQLite needs a limit when using offset, so use a very large number
        qb = qb.limit(Number.MAX_SAFE_INTEGER)
      }
      if (query.$skip) {
        qb = qb.offset(query.$skip)
      }
    }

    return qb.execute() as Promise<Result[]>
  }

  async get(id: Primitive, params?: Params): Promise<Result | null> {
    const { query = {} } = (params || {}) as any
    const db = this.getDb(params)

    let qb = db.selectFrom(this.table)

    // Apply field selection
    if (query.$select && Array.isArray(query.$select)) {
      // Always include the id field
      const fieldsToSelect = query.$select.includes(this.id) ? query.$select : [this.id, ...query.$select]
      qb = qb.select(fieldsToSelect as any)
    } else {
      qb = qb.selectAll()
    }

    // Apply id filter
    qb = qb.where(this.id, '=', id)

    // Apply additional query filters
    const filters = { ...query }
    delete filters.$select

    if (Object.keys(filters).length > 0) {
      qb = this.buildQuery(filters, qb)
    }

    const result = await qb.executeTakeFirst()
    return (result || null) as Result | null
  }

  async create(data: Data[], params?: Params): Promise<Result[]>
  async create(data: Data, params?: Params): Promise<Result>
  async create(data: Data | Data[], params?: Params): Promise<Result[] | Result> {
    const db = this.getDb(params)

    try {
      if (Array.isArray(data)) {
        // Bulk create
        if (data.length === 0) {
          return []
        }

        // Use batch size if configured
        const batchSize = this.options.batchSize || (this.dialect === 'sqlite' ? 1 : 1000)

        // SQLite doesn't support returning with multiple inserts
        // MySQL doesn't support RETURNING at all
        if (this.dialect === 'sqlite' || this.dialect === 'mysql' || batchSize === 1) {
          const results: Result[] = []
          for (const item of data) {
            // Convert boolean values to integers for SQLite
            const itemData = this.convertBooleansForSQLite(item)

            if (this.dialect === 'mysql') {
              // MySQL doesn't support RETURNING, so insert then fetch
              const insertResult = await db
                .insertInto(this.table)
                .values(itemData as any)
                .execute()

              // Get the inserted ID
              const insertId = (insertResult as any)[0]?.insertId || (itemData as any)[this.id]
              if (insertId) {
                const result = await db
                  .selectFrom(this.table)
                  .selectAll()
                  .where(this.id, '=', insertId)
                  .executeTakeFirst()
                if (result) {
                  results.push(result as Result)
                }
              }
            } else {
              const result = await db
                .insertInto(this.table)
                .values(itemData as any)
                .returningAll()
                .executeTakeFirst()
              if (result) {
                results.push(result as Result)
              }
            }
          }
          return results
        }

        // For other databases with RETURNING support, insert in batches
        const results: Result[] = []
        for (let i = 0; i < data.length; i += batchSize) {
          const batch = data.slice(i, i + batchSize)
          const batchResult = await db
            .insertInto(this.table)
            .values(batch as any)
            .returningAll()
            .execute()
          results.push(...(batchResult as unknown as Result[]))
        }
        return results
      }

      // Single create
      // Convert boolean values to integers for SQLite
      const createData = this.convertBooleansForSQLite(data)

      if (this.dialect === 'mysql') {
        // MySQL doesn't support RETURNING, so insert then fetch
        const insertResult = await db
          .insertInto(this.table)
          .values(createData as any)
          .execute()

        // Get the inserted ID
        const insertId = (insertResult as any)[0]?.insertId || (createData as any)[this.id]
        if (!insertId) {
          throw new GeneralError(`Failed to get insert ID for table: ${this.table}`)
        }

        const result = await db
          .selectFrom(this.table)
          .selectAll()
          .where(this.id, '=', insertId)
          .executeTakeFirst()

        if (!result) {
          throw new GeneralError(`Failed to retrieve created record from table: ${this.table}`)
        }

        return result as unknown as Result
      } else {
        const result = await db
          .insertInto(this.table)
          .values(createData as any)
          .returningAll()
          .executeTakeFirst()

        if (!result) {
          throw new GeneralError(`Failed to create record in table: ${this.table}`)
        }

        return result as unknown as Result
      }
    } catch (error: any) {
      if (this.options.debug) {
        console.error(`[Kysely Adapter] Create error in table ${this.table}:`, error)
      }
      this.handleDatabaseError(error, 'create')
    }
  }

  async patch(id: Primitive, data: PatchData, params?: Params): Promise<Result | null> {
    // Wings safety: prevent accidental bulk operations
    if (id === null || id === undefined) {
      throw new BadRequest('patch() requires a non-null id. Use patchMany() for bulk operations.')
    }

    const { query = {} } = (params || {}) as any
    const db = this.getDb(params)

    // Convert boolean values to integers for SQLite
    const patchData = this.convertBooleansForSQLite(data)
    let qb = db
      .updateTable(this.table)
      .set(patchData as any)
      .where(this.id, '=', id)

    // Apply additional query conditions
    const filters = { ...query }
    delete filters.$select

    if (Object.keys(filters).length > 0) {
      qb = this.applyWhereConditions(qb, filters)
    }

    if (this.supportsReturning) {
      // Apply field selection for return
      if (query.$select && Array.isArray(query.$select)) {
        // Always include the id field
        const fieldsToSelect = query.$select.includes(this.id) ? query.$select : [this.id, ...query.$select]
        qb = qb.returning(fieldsToSelect as any) as any
      } else {
        qb = qb.returningAll() as any
      }

      const result = await qb.executeTakeFirst()
      return (result || null) as Result | null
    } else {
      // MySQL doesn't support RETURNING, so update then fetch
      const updateResult = await qb.execute()

      // Check if any rows were affected
      // Kysely returns UpdateResult with numUpdatedRows for MySQL
      const affectedRows =
        (updateResult as any)[0]?.numUpdatedRows || (updateResult as any).numAffectedRows || 0
      // Handle both number and BigInt types
      if (affectedRows === 0 || affectedRows.toString() === '0') {
        return null
      }

      // Fetch the updated record - remove query constraints that were used for WHERE clause
      const getParams = { ...params }
      if (query.$select) {
        getParams.query = { $select: query.$select }
      } else {
        delete getParams.query
      }
      return this.get(id, getParams)
    }
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

    // Convert boolean values to integers for SQLite
    const patchData = this.convertBooleansForSQLite(data)
    let qb = db.updateTable(this.table).set(patchData as any)

    // Apply filters
    if (Object.keys(filters).length > 0) {
      qb = this.applyWhereConditions(qb, filters)
    }

    if (this.supportsReturning) {
      // Apply field selection for return
      if (query.$select && Array.isArray(query.$select)) {
        // Always include the id field
        const fieldsToSelect = query.$select.includes(this.id) ? query.$select : [this.id, ...query.$select]
        qb = qb.returning(fieldsToSelect as any) as any
      } else {
        qb = qb.returningAll() as any
      }

      const result = await qb.execute()
      return result as unknown as Result[]
    } else {
      // MySQL doesn't support RETURNING, so update then fetch
      await qb.execute()

      // Fetch the updated records
      const findParams = { ...params, query: { ...filters, $select: query.$select } }
      return this.find(findParams) as Promise<Result[]>
    }
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
      qb = this.applyWhereConditions(qb, filters)
    }

    if (this.supportsReturning) {
      // Apply field selection for return
      if (query.$select && Array.isArray(query.$select)) {
        // Always include the id field
        const fieldsToSelect = query.$select.includes(this.id) ? query.$select : [this.id, ...query.$select]
        qb = qb.returning(fieldsToSelect as any) as any
      } else {
        qb = qb.returningAll() as any
      }

      const result = await qb.executeTakeFirst()
      return (result || null) as Result | null
    } else {
      // MySQL doesn't support RETURNING, so fetch then delete
      const record = await this.get(id, params)
      if (!record) return null

      await qb.execute()
      return record
    }
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
      qb = this.applyWhereConditions(qb, filters)
    }

    if (this.supportsReturning) {
      // Apply field selection for return
      if (query.$select && Array.isArray(query.$select)) {
        // Always include the id field
        const fieldsToSelect = query.$select.includes(this.id) ? query.$select : [this.id, ...query.$select]
        qb = qb.returning(fieldsToSelect as any) as any
      } else {
        qb = qb.returningAll() as any
      }

      const result = await qb.execute()
      return result as unknown as Result[]
    } else {
      // MySQL doesn't support RETURNING, so fetch then delete
      const findParams = { ...params, query: { ...filters, $select: query.$select } }
      const records = await this.find(findParams)

      await qb.execute()
      return records as unknown as Result[]
    }
  }

  async removeAll(): Promise<Result[]> {
    const db = this.getDb()

    if (this.supportsReturning) {
      const result = await db.deleteFrom(this.table).returningAll().execute()
      return result as unknown as Result[]
    } else {
      // MySQL doesn't support RETURNING, so fetch all then delete
      const records = await this.find()
      await db.deleteFrom(this.table).execute()
      return records as unknown as Result[]
    }
  }
}
