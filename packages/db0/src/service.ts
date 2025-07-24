import type { Database, Primitive } from 'db0'
import { GeneralError, BadRequest } from '@feathersjs/errors'
import { errorHandler } from './error-handler'

// Allow db0 identifier objects as sql arguments
export interface Db0Identifier {
  [x: symbol]: string
}
export type Db0SqlArg = Primitive | Db0Identifier
export type DbRecord = Record<string, Primitive>

export interface Paginated<T> {
  total: number
  limit: number
  skip: number
  data: T[]
}

interface Db0QueryOperators {
  $like?: string
  $ilike?: string
  $in?: Primitive[]
  $nin?: Primitive[]
  $ne?: Primitive
  $gt?: Primitive
  $gte?: Primitive
  $lt?: Primitive
  $lte?: Primitive
  $exists?: boolean
}

export type Db0QueryValue = Primitive | Db0QueryOperators

export interface Db0Query {
  $select?: string[]
  $sort?: Record<string, 1 | -1>
  $skip?: number
  $limit?: number
  $or?: Db0Query[]
  $and?: Db0Query[]
  [key: string]: any
}

export interface Db0Params {
  query?: Db0Query
  paginate?: boolean
  [key: string]: any
}
export interface Db0ParamsMany extends Db0Params {
  allowAll?: boolean
}

export type SqlDialect = 'sqlite' | 'mysql' | 'postgres'

/**
 * Options for initializing a SqlService instance.
 * @property db - The database connection instance.
 * @property table - The table name for this service.
 * @property idField - The primary key field name (default: 'id').
 * @property dialect - SQL dialect: 'sqlite', 'mysql', or 'postgres'. Determines identifier quoting and parameter style.
 */
export interface Db0AdapterOptions {
  db: Database
  table: string
  idField?: string
  dialect?: SqlDialect
}

export class Db0Adapter<RT extends DbRecord> {
  db: Database
  table: string
  idField: string
  dialect: SqlDialect
  options: Db0AdapterOptions

  // Dialect-specific utilities
  private static dialectUtils = {
    mysql: {
      supportsReturning: false,
      quoteIdentifier: (id: string) => `\`${id}\``,
      getUnlimitedLimit: () => '18446744073709551615', // MySQL max BIGINT UNSIGNED
      getInsertId: (result: any) => result.insertId || null,
      getAffectedRows: (result: any) => result.affectedRows || 0
    },
    postgres: {
      supportsReturning: true,
      quoteIdentifier: (id: string) => `"${id}"`,
      getUnlimitedLimit: () => 'ALL',
      getInsertId: (result: any) => result.lastInsertRowid || null,
      getAffectedRows: (result: any) => result.changes || 0
    },
    sqlite: {
      supportsReturning: true,
      quoteIdentifier: (id: string) => `"${id}"`,
      getUnlimitedLimit: () => '-1',
      getInsertId: (result: any) => result.lastInsertRowid || null,
      getAffectedRows: (result: any) => result.changes || 0
    }
  }

  // Reference to the appropriate utilities for this instance
  private utils: typeof Db0Adapter.dialectUtils.mysql

  constructor(options: Db0AdapterOptions) {
    this.db = options.db
    this.table = options.table
    this.idField = options.idField || 'id'
    this.dialect = options.dialect || 'sqlite'
    this.options = options

    // Select the appropriate utilities based on dialect
    this.utils = Db0Adapter.dialectUtils[this.dialect]
  }

  // FeathersJS compatibility: provide id property
  get id() {
    return this.idField
  }

  /**
   * Quote a SQL identifier (e.g. table or column name) for the given dialect.
   * @param id - The identifier to quote.
   * @param dialect - The SQL dialect ('sqlite', 'mysql', or 'postgres').
   * @returns The quoted identifier string.
   */
  static quoteId(id: string, dialect: SqlDialect): string {
    return Db0Adapter.dialectUtils[dialect].quoteIdentifier(id)
  }

  // Convert ? placeholders to $n for Postgres
  private toPostgresPlaceholders(this: Db0Adapter<RT>, sql: string): string {
    let i = 0
    return sql.replace(/\?/g, () => `$${++i}`)
  }

  // Convert values for database compatibility (e.g., boolean to integer for SQLite)
  private convertValue(value: Primitive): Primitive {
    // Convert booleans to integers for SQLite compatibility
    if (typeof value === 'boolean') {
      return value ? 1 : 0
    }
    return value
  }

  // Rewrite placeholders for Postgres
  private async runSqlAll(this: Db0Adapter<RT>, sql: string, values: Primitive[]): Promise<any[]> {
    try {
      if (this.dialect === 'postgres') {
        sql = this.toPostgresPlaceholders(sql)
      }
      return this.db.prepare(sql).all(...values)
    } catch (error) {
      errorHandler(error)
      throw error // This will never be reached because errorHandler always throws
    }
  }

  private async runSqlRun(this: Db0Adapter<RT>, sql: string, values: Primitive[]): Promise<any> {
    try {
      if (this.dialect === 'postgres') {
        sql = this.toPostgresPlaceholders(sql)
      }
      return this.db.prepare(sql).run(...values)
    } catch (error) {
      errorHandler(error)
    }
  }

  /**
   * Find records matching the query.
   * @param params - Query and options for the find operation.
   * @returns Array of records matching the criteria.
   */
  async find(params?: Db0Params & { paginate?: false }): Promise<RT[]>
  async find(params: Db0Params & { paginate: true }): Promise<Paginated<RT>>
  async find(params?: Db0Params): Promise<RT[] | Paginated<RT>> {
    const query = params?.query || {}
    const isPaginated = params?.paginate === true

    if (isPaginated) {
      // Get total count first for pagination
      const countQuery = { ...query }
      delete countQuery.$limit
      delete countQuery.$skip
      delete countQuery.$sort
      delete countQuery.$select

      const { sql: countWhereSql, vals: countWhereVals } = this.buildWhere(countQuery)
      const countWhereClause = countWhereSql ? `WHERE ${countWhereSql}` : ''
      const countSql = `SELECT COUNT(*) as total FROM ${Db0Adapter.quoteId(
        this.table,
        this.dialect
      )} ${countWhereClause}`.trim()
      const countResult = await this.runSqlAll(countSql, countWhereVals)
      const total = Number((countResult[0] as any).total || 0)

      // Get paginated data
      const data = await this.findData(params)

      return {
        total,
        limit: query.$limit || 0,
        skip: query.$skip || 0,
        data
      }
    } else {
      // Non-paginated, return array directly
      return this.findData(params)
    }
  }

  private async findData(params?: Db0Params): Promise<RT[]> {
    const query = params?.query || {}
    let columns = '*'
    let orderBy = ''
    let limit = ''
    let offset = ''

    // Handle $limit and $skip (OFFSET)
    if (query.$limit !== undefined) {
      limit = `LIMIT ${Number(query.$limit)}`
    }
    if (query.$skip !== undefined) {
      if (!limit) {
        limit = `LIMIT ${this.utils.getUnlimitedLimit()}`
      }
      offset = `OFFSET ${Number(query.$skip)}`
    }

    // Handle $select
    columns = this._getSelectColumns(query)

    // Handle $sort
    if (query.$sort && typeof query.$sort === 'object') {
      const sort = query.$sort as Record<string, 1 | -1>
      const sortFields = Object.keys(sort)
      if (sortFields.length) {
        orderBy = `ORDER BY ${sortFields
          .map((f) => `${Db0Adapter.quoteId(f, this.dialect)} ${sort[f] === 1 ? 'ASC' : 'DESC'}`)
          .join(', ')}`
      }
      delete query.$sort
    }

    // Build WHERE clause recursively
    const { sql: whereSql, vals: whereVals } = this.buildWhere(query)
    const whereClause = whereSql ? `WHERE ${whereSql}` : ''
    const sql = `SELECT ${columns} FROM ${Db0Adapter.quoteId(
      this.table,
      this.dialect
    )} ${whereClause} ${orderBy} ${limit} ${offset}`.trim()
    const rows = await this.runSqlAll(sql, whereVals)
    return rows as RT[]
  }

  /**
   * Recursively build SQL WHERE clause and values from a query object.
   * @param queryObj - The query object (may contain $or, $and, operators, etc).
   * @returns An object with the SQL string and parameter values.
   */
  private buildWhere(queryObj: Db0Query): { sql: string; vals: Primitive[] } {
    const clauses: string[] = []
    const vals: Primitive[] = []
    for (const [field, value] of Object.entries(queryObj)) {
      if (field === '$or' && Array.isArray(value)) {
        const orParts = value.map((sub) => this.buildWhere(sub))
        clauses.push(`(${orParts.map((p) => p.sql).join(' OR ')})`)
        vals.push(...orParts.flatMap((p: { sql: string; vals: Primitive[] }) => p.vals))
      } else if (field === '$and' && Array.isArray(value)) {
        const andParts = value.map((sub) => this.buildWhere(sub))
        clauses.push(`(${andParts.map((p) => p.sql).join(' AND ')})`)
        vals.push(...andParts.flatMap((p: { sql: string; vals: Primitive[] }) => p.vals))
      } else if (field.startsWith('$')) {
        // skip, already handled
        continue
      } else if (typeof value === 'object' && value !== null) {
        for (const [op, v] of Object.entries(value)) {
          switch (op) {
            case '$in':
              if (Array.isArray(v) && v.length > 0) {
                clauses.push(`${Db0Adapter.quoteId(field, this.dialect)} IN (${v.map(() => '?').join(', ')})`)
                vals.push(...v.map((item) => this.convertValue(item)))
              } else {
                clauses.push('0')
              }
              break
            case '$nin':
              if (Array.isArray(v) && v.length > 0) {
                clauses.push(
                  `${Db0Adapter.quoteId(field, this.dialect)} NOT IN (${v.map(() => '?').join(', ')})`
                )
                vals.push(...v.map((item) => this.convertValue(item)))
              }
              break
            case '$ne':
              if (v === null) {
                clauses.push(`${Db0Adapter.quoteId(field, this.dialect)} IS NOT NULL`)
              } else {
                clauses.push(`${Db0Adapter.quoteId(field, this.dialect)} != ?`)
                vals.push(this.convertValue(v as Primitive))
              }
              break
            case '$gt':
              clauses.push(`${Db0Adapter.quoteId(field, this.dialect)} > ?`)
              vals.push(this.convertValue(v as Primitive))
              break
            case '$gte':
              clauses.push(`${Db0Adapter.quoteId(field, this.dialect)} >= ?`)
              vals.push(this.convertValue(v as Primitive))
              break
            case '$lt':
              clauses.push(`${Db0Adapter.quoteId(field, this.dialect)} < ?`)
              vals.push(this.convertValue(v as Primitive))
              break
            case '$lte':
              clauses.push(`${Db0Adapter.quoteId(field, this.dialect)} <= ?`)
              vals.push(this.convertValue(v as Primitive))
              break
            case '$like':
              clauses.push(`${Db0Adapter.quoteId(field, this.dialect)} LIKE ?`)
              vals.push(v as string)
              break
            case '$notlike':
              clauses.push(`${Db0Adapter.quoteId(field, this.dialect)} NOT LIKE ?`)
              vals.push(v as string)
              break
            case '$ilike':
              if (this.dialect === 'postgres') {
                clauses.push(`${Db0Adapter.quoteId(field, this.dialect)} ILIKE ?`)
              } else {
                clauses.push(`LOWER(${Db0Adapter.quoteId(field, this.dialect)}) LIKE LOWER(?)`)
              }
              vals.push(v as string)
              break
            case '$isNull':
              if (v === true) {
                clauses.push(`${Db0Adapter.quoteId(field, this.dialect)} IS NULL`)
              } else if (v === false) {
                clauses.push(`${Db0Adapter.quoteId(field, this.dialect)} IS NOT NULL`)
              }
              break
            default:
              // ignore unknown
              break
          }
        }
      } else {
        if (value === null) {
          clauses.push(`${Db0Adapter.quoteId(field, this.dialect)} IS NULL`)
        } else {
          clauses.push(`${Db0Adapter.quoteId(field, this.dialect)} = ?`)
          vals.push(this.convertValue(value as Primitive))
        }
      }
    }
    return { sql: clauses.join(' AND '), vals }
  }

  /**
   * Retrieve a single record by primary key.
   * @param id - The primary key value.
   * @param params - Optional query parameters (e.g. $select fields).
   * @returns The found record, or null if not found.
   */
  async get(id: Primitive, params?: Db0Params): Promise<RT | null> {
    let columns = '*'
    const query = params?.query ? { ...params.query } : {}

    columns = this._getSelectColumns(query)

    const { sql: whereClause, values } = this.buildWhereClause(query, id)
    const sql = `SELECT ${columns} FROM ${Db0Adapter.quoteId(this.table, this.dialect)} ${whereClause}`
    const rows = await this.runSqlAll(sql, values)
    return (rows[0] ?? null) as RT | null
  }

  private async createOne(data: Record<string, Primitive>): Promise<RT> {
    const fields = Object.keys(data)
    const values = fields.map((f) => this.convertValue(data[f]))
    const columns = fields.map((f) => Db0Adapter.quoteId(f, this.dialect)).join(', ')
    const placeholders = fields.map(() => '?').join(', ')

    const sql = `INSERT INTO ${Db0Adapter.quoteId(
      this.table,
      this.dialect
    )} (${columns}) VALUES (${placeholders})`

    if (this.utils.supportsReturning) {
      const rows = await this.runSqlAll(`${sql} RETURNING *`, values)
      const record = rows[0] as RT | undefined
      if (!record) {
        throw new GeneralError('Failed to retrieve inserted record')
      }
      return record
    } else {
      // MySQL doesn't support RETURNING, so insert then fetch
      const result = await this.db.prepare(sql).run(...values)
      const insertId = this.utils.getInsertId(result)
      if (!insertId) {
        throw new GeneralError('Failed to get insert ID')
      }

      // Fetch the created record
      const selectSql = `SELECT * FROM ${Db0Adapter.quoteId(this.table, this.dialect)} WHERE ${Db0Adapter.quoteId(
        this.idField,
        this.dialect
      )} = ?`
      const rows = await this.runSqlAll(selectSql, [insertId])
      const record = rows[0] as RT | undefined
      if (!record) {
        throw new GeneralError('Failed to retrieve inserted record')
      }
      return record
    }
  }

  private async createMany(data: Array<Record<string, Primitive>>): Promise<RT[]> {
    if (!data.length) return []
    const fields = Array.from(new Set(data.flatMap(Object.keys)))
    const columns = fields.map((f: string) => Db0Adapter.quoteId(f, this.dialect)).join(', ')

    // For each row, ensure every field is present, fill missing with null
    const rowPlaceholders = data.map(() => `(${fields.map(() => '?').join(', ')})`).join(', ')
    const allValues = data.flatMap((row: Record<string, Primitive>) =>
      fields.map((f: string) => this.convertValue(row[f] ?? null))
    )

    const sql = `INSERT INTO ${Db0Adapter.quoteId(
      this.table,
      this.dialect
    )} (${columns}) VALUES ${rowPlaceholders}`

    if (this.utils.supportsReturning) {
      const rows = await this.runSqlAll(`${sql} RETURNING *`, allValues)
      return rows as RT[]
    } else {
      // MySQL doesn't support RETURNING, so insert then fetch
      const result = await this.db.prepare(sql).run(...allValues)
      const firstInsertId = this.utils.getInsertId(result)
      const affectedRows = this.utils.getAffectedRows(result) || data.length

      if (!firstInsertId) {
        throw new GeneralError('Failed to get insert ID')
      }

      // Fetch the created records - MySQL auto_increment IDs are sequential
      const ids = Array.from({ length: affectedRows }, (_, i) => firstInsertId + i)
      const placeholders = ids.map(() => '?').join(', ')
      const selectSql = `SELECT * FROM ${Db0Adapter.quoteId(this.table, this.dialect)} WHERE ${Db0Adapter.quoteId(
        this.idField,
        this.dialect
      )} IN (${placeholders})`
      const rows = await this.runSqlAll(selectSql, ids)
      return rows as RT[]
    }
  }

  /**
   * Create one or more records in the table.
   * @param data - A single record or an array of records to insert.
   * @returns The created record(s).
   */
  async create(data: Record<string, Primitive>): Promise<RT>
  async create(data: Array<Record<string, Primitive>>): Promise<RT[]>
  async create(data: Record<string, Primitive> | Array<Record<string, Primitive>>): Promise<RT | RT[]> {
    if (Array.isArray(data)) {
      return this.createMany(data)
    } else {
      return this.createOne(data)
    }
  }

  /**
   * Patch (update) a single record by primary key.
   * @param id - The primary key value.
   * @param data - The fields to update.
   * @param params - Query parameters including $select and additional conditions.
   * @returns The updated record, or null if not found.
   */
  async patch(id: Primitive, data: Record<string, Primitive>, params?: Db0Params): Promise<RT | null> {
    // Wings safety: prevent accidental bulk operations
    if (id === null || id === undefined) {
      throw new BadRequest('patch() requires a non-null id. Use patchMany() for bulk operations.')
    }

    const fields = Object.keys(data)
    if (!fields.length) return this.get(id, params)

    const assignments = fields.map((f) => `${Db0Adapter.quoteId(f, this.dialect)} = ?`).join(', ')
    const values = fields.map((f) => this.convertValue(data[f]))

    // Use buildWhereClause to handle both id and additional query conditions
    const { sql: whereClause, values: whereValues } = this.buildWhereClause(params?.query || {}, id)

    const sql = `UPDATE ${Db0Adapter.quoteId(this.table, this.dialect)} SET ${assignments} ${whereClause}`

    if (this.utils.supportsReturning) {
      const columns = this._getSelectColumns(params?.query || {})
      const rows = await this.runSqlAll(`${sql} RETURNING ${columns}`, [...values, ...whereValues])
      return (rows[0] ?? null) as RT | null
    } else {
      // MySQL doesn't support RETURNING, so update then fetch
      const result = await this.db.prepare(sql).run(...[...values, ...whereValues])

      // Check if any rows were affected
      const affectedRows = this.utils.getAffectedRows(result)
      if (affectedRows === 0) {
        return null
      }

      // Fetch the updated record - don't include query conditions since they might not match after update
      const selectParams = params ? { query: { $select: params.query?.$select } } : undefined
      return this.get(id, selectParams)
    }
  }

  // Helper to build SQL WHERE clause and values from a query object (and optionally an initial id)
  private buildWhereClause(
    query: Record<string, Primitive>,
    id?: Primitive
  ): { sql: string; values: Primitive[] } {
    const clauses: string[] = id ? [`${Db0Adapter.quoteId(this.idField, this.dialect)} = ?`] : []
    const values: Primitive[] = id ? [id] : []
    for (const [key, value] of Object.entries(query)) {
      if (!key.startsWith('$')) {
        clauses.push(`${Db0Adapter.quoteId(key, this.dialect)} = ?`)
        values.push(this.convertValue(value))
      }
    }
    const whereSql = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
    return { sql: whereSql, values }
  }

  /**
   * Build a SQL columns string for $select queries, always including the id field. Mutates the query object to remove $select if present.
   * @param query - The query object (may contain $select)
   * @returns The SQL columns string.
   */
  private _getSelectColumns(query: any): string {
    if (query && query.$select && Array.isArray(query.$select)) {
      const selectFields = new Set([this.idField, ...query.$select])
      const columns = Array.from(selectFields)
        .map((f) => Db0Adapter.quoteId(f, this.dialect))
        .join(', ')
      delete query.$select
      return columns
    }
    return '*'
  }

  /**
   * Patch (update) multiple records matching the query.
   * @param data - The fields to update.
   * @param params - Query and options for the patch operation.
   * @returns Array of updated records.
   */
  async patchMany(data: Record<string, Primitive>, params?: Db0ParamsMany): Promise<RT[]> {
    const query = params?.query || {}
    if (!query || (Object.keys(query).length === 0 && !params?.allowAll))
      throw new GeneralError('patchMany: No query provided. Use allowAll:true to patch all records')

    let columns = '*'
    columns = this._getSelectColumns(query)
    const { sql: whereSql, vals: whereVals } = this.buildWhere(query)
    const fields = Object.keys(data)
    if (!fields.length) return []
    const assignments = fields.map((f) => `${Db0Adapter.quoteId(f, this.dialect)} = ?`).join(', ')
    const setValues = fields.map((f) => this.convertValue(data[f]))

    const sql = `UPDATE ${Db0Adapter.quoteId(this.table, this.dialect)} SET ${assignments} ${
      whereSql ? 'WHERE ' + whereSql : ''
    }`

    if (this.utils.supportsReturning) {
      const rows = await this.runSqlAll(`${sql} RETURNING ${columns}`, [...setValues, ...whereVals])
      return rows as RT[]
    } else {
      // MySQL doesn't support RETURNING, so update then fetch
      await this.db.prepare(sql).run(...[...setValues, ...whereVals])

      // Fetch the updated records
      const selectSql = `SELECT ${columns} FROM ${Db0Adapter.quoteId(this.table, this.dialect)} ${
        whereSql ? 'WHERE ' + whereSql : ''
      }`
      const rows = await this.runSqlAll(selectSql, whereVals)
      return rows as RT[]
    }
  }

  /**
   * Remove a single record by primary key.
   * @param id - The primary key value.
   * @param params - Optional query parameters (e.g. $select fields).
   * @returns The removed record, or null if not found.
   */
  async remove(id: Primitive, params?: Db0Params): Promise<RT | null> {
    // Wings safety: prevent accidental bulk operations
    if (id === null || id === undefined) {
      throw new BadRequest('remove() requires a non-null id. Use removeMany() for bulk operations.')
    }

    let columns = '*'
    const query = params?.query ? { ...params.query } : {}

    columns = this._getSelectColumns(query)

    const { sql: whereSql, values: whereValues } = this.buildWhereClause(query, id)

    if (this.utils.supportsReturning) {
      const sql = `DELETE FROM ${Db0Adapter.quoteId(this.table, this.dialect)} ${whereSql} RETURNING ${columns}`
      const rows = await this.runSqlAll(sql, whereValues)
      return (rows[0] ?? null) as RT | null
    } else {
      // MySQL doesn't support RETURNING, so fetch then delete
      const record = await this.get(id, params)
      if (!record) return null

      const deleteSql = `DELETE FROM ${Db0Adapter.quoteId(this.table, this.dialect)} ${whereSql}`
      await this.db.prepare(deleteSql).run(...whereValues)
      return record
    }
  }

  /**
   * Remove multiple records matching the query.
   * @param params - Query and options for the remove operation.
   * @returns Array of removed records.
   */
  async removeMany(params?: Db0ParamsMany): Promise<RT[]> {
    const query = params?.query || {}
    if (!query || (Object.keys(query).length === 0 && !params?.allowAll))
      throw new GeneralError(
        'removeMany: No query provided. Use allowAll:true or call removeAll() to remove all records'
      )

    const items = await this.find({ query })
    if (!Array.isArray(items) || !items.length) return []
    const ids = items.map((item) => (item as any)[this.idField])
    if (!ids.length) return items
    const placeholders = ids.map(() => '?').join(', ')
    const sql = `DELETE FROM ${Db0Adapter.quoteId(this.table, this.dialect)} WHERE ${Db0Adapter.quoteId(
      this.idField,
      this.dialect
    )} IN (${placeholders})`
    await this.runSqlRun(sql, ids)
    return items
  }

  /**
   * Remove all records from the table.
   * @returns An empty array.
   */
  async removeAll(): Promise<RT[]> {
    const sql = `DELETE FROM ${Db0Adapter.quoteId(this.table, this.dialect)}`
    await this.runSqlRun(sql, [])
    return []
  }
}

export function adapter<T extends Record<string, any>>(options: Db0AdapterOptions): Db0Adapter<T> {
  return new Db0Adapter<T>(options)
}

// Backwards compatibility
export const service = adapter
