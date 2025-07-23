// Types will be available through wrangler configuration
import type { Connector, Primitive } from 'db0'

// Cloudflare SQL Storage types
type SqlStorageValue = ArrayBuffer | string | number | null

declare abstract class SqlStorageCursor<T extends Record<string, SqlStorageValue>> {
  next(): { done: boolean; value?: T } | Promise<{ done: boolean; value?: T }>
  toArray(): T[]
  one(): T
  raw<U extends SqlStorageValue[]>(): IterableIterator<U>
  columnNames: string[]
  get rowsRead(): number
  get rowsWritten(): number
}

export interface SqlStorageCursorWithMeta<
  T extends Record<string, SqlStorageValue> = Record<string, SqlStorageValue>
> extends SqlStorageCursor<T> {
  changes?: number
  lastInsertRowid?: number
}

export interface DurableObjectSql {
  exec: (sql: string, ...bindings: any[]) => SqlStorageCursorWithMeta<any>
  databaseSize: number
}

export interface DurableObjectConnectorOptions {
  sql: DurableObjectSql
}

function asArray<T = any>(val: any): Promise<T[]> | T[] {
  if (!val) return []
  if (Array.isArray(val)) return val
  if (typeof val.toArray === 'function') {
    return val.toArray()
  }
  if (typeof val[Symbol.iterator] === 'function') {
    return Array.from(val)
  }
  return [val]
}

function durableObjectSqlConnector(options: DurableObjectConnectorOptions): Connector<DurableObjectSql> {
  const getDB = () => {
    if (!options.sql) {
      throw new Error('[db0] [durable-object] sql instance not provided')
    }
    return options.sql
  }

  return {
    name: 'cloudflare-durable-object-sql',
    dialect: 'sqlite',
    getInstance: () => getDB(),
    exec: (...args: [string, ...any[]]) => asArray(getDB().exec(...args)),
    prepare: (sql: string) => {
      return new Statement(sql, getDB)
    }
  }
}

class Statement {
  sql: string
  getDB: () => DurableObjectSql
  boundParams: Primitive[]

  constructor(sql: string, getDB: () => DurableObjectSql, boundParams: Primitive[] = []) {
    this.sql = sql
    this.getDB = getDB
    this.boundParams = boundParams
  }

  /**
   * Binds parameters to the statement.
   * @param {...Primitive[]} params - Parameters to bind to the SQL statement.
   * @returns {Statement} The instance of the statement with bound parameters.
   */
  bind(...params: Primitive[]): Statement {
    return new Statement(this.sql, this.getDB, params)
  }

  /**
   * Executes the statement and returns all resulting rows as an array.
   * @param {...Primitive[]} params - Parameters to bind to the SQL statement.
   * @returns {Promise<unknown[]>} A promise that resolves to an array of rows.
   */
  async all(...params: Primitive[]): Promise<unknown[]> {
    const rows = await asArray(this.getDB().exec(this.sql, ...[...this.boundParams, ...params]))
    return rows
  }

  /**
   * Executes a statement and returns a normalized result.
   * Always returns an object with success, changes, and lastInsertRowid properties.
   */
  async run(...params: Primitive[]) {
    const result = this.getDB().exec(
      this.sql,
      ...[...this.boundParams, ...params]
    ) as SqlStorageCursorWithMeta
    const changes = typeof result.changes === 'number' ? result.changes : 0
    const lastInsertRowid = typeof result.lastInsertRowid === 'number' ? result.lastInsertRowid : 0
    return { success: true, changes, lastInsertRowid }
  }

  /**
   * Executes the statement and returns a single row.
   * @param {...Primitive[]} params - Parameters to bind to the SQL statement.
   * @returns {Promise<unknown>} A promise that resolves to the first row in the result set.
   */
  async get(...params: Primitive[]): Promise<unknown> {
    const rows = await asArray(this.getDB().exec(this.sql, ...[...this.boundParams, ...params]))
    return rows[0] ?? null
  }
}

export default durableObjectSqlConnector
export { durableObjectSqlConnector as sqlite }
