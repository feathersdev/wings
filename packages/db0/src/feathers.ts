import { NotFound } from '@feathersjs/errors'
import type { Db0Adapter, Db0AdapterOptions, DbRecord, Db0Params, Paginated } from './service.js'
import { adapter as db0Adapter } from './service.js'
import type { Primitive } from 'db0'

// FeathersJS types
export interface FeathersParams {
  query?: Record<string, any>
  paginate?: boolean
  [key: string]: any
}

// FeathersJS service interface
export interface FeathersServiceInterface<T> {
  id: string
  find(params?: FeathersParams): Promise<Paginated<T> | T[]>
  get(id: Primitive, params?: FeathersParams): Promise<T>
  create(data: Partial<T> | Array<Partial<T>>, params?: FeathersParams): Promise<T | T[]>
  update(id: Primitive, data: T, params?: FeathersParams): Promise<T>
  patch(id: Primitive | null, data: Partial<T>, params?: FeathersParams): Promise<T | T[]>
  remove(id: Primitive | null, params?: FeathersParams): Promise<T | T[]>
}

/**
 * FeathersJS-compatible wrapper for Db0Adapter.
 * Provides backward compatibility with FeathersJS service interface.
 */
export class FeathersDb0Adapter<T extends DbRecord> implements FeathersServiceInterface<T> {
  private wingsAdapter: Db0Adapter<T>

  constructor(options: Db0AdapterOptions) {
    this.wingsAdapter = db0Adapter<T>(options)
  }

  get id() {
    return this.wingsAdapter.id
  }

  get options() {
    return this.wingsAdapter.options
  }

  /**
   * Find records. Always returns Paginated<T> for FeathersJS compatibility unless paginate: false.
   */
  async find(params?: FeathersParams): Promise<Paginated<T> | T[]> {
    // For FeathersJS compatibility, paginate by default unless explicitly false
    const shouldPaginate = params?.paginate !== false

    if (shouldPaginate) {
      // Always return paginated for FeathersJS compatibility
      const result = await this.wingsAdapter.find({ ...params, paginate: true })
      return result
    } else {
      // User explicitly requested no pagination
      const wingsParams: Db0Params & { paginate?: false } = { ...params, paginate: false }
      return this.wingsAdapter.find(wingsParams)
    }
  }

  /**
   * Get a single record by ID. Throws NotFound if not found.
   */
  async get(id: Primitive, params?: FeathersParams): Promise<T> {
    const result = await this.wingsAdapter.get(id, params as Db0Params)
    if (result === null) {
      throw new NotFound(`No record found for id '${id}'`)
    }
    return result
  }

  /**
   * Create one or more records.
   */
  async create(data: Partial<T> | Array<Partial<T>>, _params?: FeathersParams): Promise<T | T[]> {
    return this.wingsAdapter.create(data as any) as Promise<T | T[]>
  }

  /**
   * Fully replace a record. FeathersJS-specific method.
   */
  async update(id: Primitive, data: T, params?: FeathersParams): Promise<T> {
    // Wings doesn't have update, so we use patch with complete data
    const result = await this.wingsAdapter.patch(id, data as any, params as Db0Params)
    if (result === null) {
      throw new NotFound(`No record found for id '${id}'`)
    }
    return result
  }

  /**
   * Partially update one or more records.
   * If id is null, performs bulk patch operation.
   */
  async patch(id: Primitive | null, data: Partial<T>, params?: FeathersParams): Promise<T | T[]> {
    if (id === null) {
      // Bulk patch operation - use patchMany with allowAll
      return this.wingsAdapter.patchMany(data as any, { ...params, allowAll: true } as any)
    } else {
      // Single patch operation
      const result = await this.wingsAdapter.patch(id, data as any, params as Db0Params)
      if (result === null) {
        throw new NotFound(`No record found for id '${id}'`)
      }
      return result
    }
  }

  /**
   * Remove one or more records.
   * If id is null, performs bulk remove operation.
   */
  async remove(id: Primitive | null, params?: FeathersParams): Promise<T | T[]> {
    if (id === null) {
      // Bulk remove operation - use removeMany with allowAll
      return this.wingsAdapter.removeMany({ ...params, allowAll: true } as any)
    } else {
      // Single remove operation
      const result = await this.wingsAdapter.remove(id, params as Db0Params)
      if (result === null) {
        throw new NotFound(`No record found for id '${id}'`)
      }
      return result
    }
  }
}

/**
 * Create a FeathersJS-compatible db0 service.
 */
export function adapter<T extends DbRecord>(options: Db0AdapterOptions): FeathersDb0Adapter<T> {
  return new FeathersDb0Adapter<T>(options)
}

// Backwards compatibility
export const service = adapter
export const FeathersDb0Service = FeathersDb0Adapter
