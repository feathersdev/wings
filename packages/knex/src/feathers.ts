import { NotFound } from '@feathersjs/errors'
import { KnexAdapter, KnexOptions, KnexSettings, KnexParams } from './index'
import type { Id, NullableId, Paginated, Primitive, AdapterInterface } from '@wingshq/adapter-commons'

// FeathersJS types
export interface FeathersParams {
  query?: Record<string, any>
  paginate?: boolean
  [key: string]: any
}

// Use the standard AdapterInterface for FeathersJS compatibility
export type FeathersServiceInterface<T> = AdapterInterface<
  T,
  Partial<T>,
  Partial<T>,
  T,
  KnexOptions,
  FeathersParams
>

export class FeathersKnexAdapter<T extends Record<string, any> = any> implements FeathersServiceInterface<T> {
  private wingsService: KnexAdapter<T>

  constructor(settings: KnexSettings) {
    this.wingsService = new KnexAdapter<T>(settings)
  }

  get options() {
    return this.wingsService.options
  }

  get id() {
    return this.wingsService.id
  }

  async find(params?: FeathersParams & { paginate?: false }): Promise<T[]>
  async find(params: FeathersParams & { paginate: true }): Promise<Paginated<T>>
  async find(params?: FeathersParams): Promise<Paginated<T> | T[]>
  async find(params?: FeathersParams): Promise<Paginated<T> | T[]> {
    // FeathersJS always returns paginated unless explicitly disabled
    if (params?.paginate === false) {
      return this.wingsService.find({
        ...(params as KnexParams),
        paginate: false
      })
    }

    // Otherwise always paginate (FeathersJS default behavior)
    return this.wingsService.find({
      ...(params as KnexParams),
      paginate: true
    })
  }

  async get(id: Id, params?: FeathersParams): Promise<T> {
    const result = await this.wingsService.get(id as Primitive, params as KnexParams)
    if (result === null) {
      throw new NotFound(`No record found for id '${id}'`)
    }
    return result
  }

  async create(data: Partial<T>[], params?: FeathersParams): Promise<T[]>
  async create(data: Partial<T>, params?: FeathersParams): Promise<T>
  async create(data: Partial<T> | Partial<T>[], params?: FeathersParams): Promise<T | T[]> {
    return this.wingsService.create(data as any, params as KnexParams)
  }

  async update(id: Id, data: T, params?: FeathersParams): Promise<T> {
    // FeathersJS update delegates to patch
    return this.patch(id, data, params) as Promise<T>
  }

  async patch(id: Id, data: Partial<T>, params?: FeathersParams): Promise<T>
  async patch(id: null, data: Partial<T>, params?: FeathersParams): Promise<T[]>
  async patch(id: NullableId, data: Partial<T>, params?: FeathersParams): Promise<T | T[]> {
    if (id === null) {
      // Bulk operation - map to patchMany
      return this.wingsService.patchMany(data, {
        ...(params as KnexParams),
        allowAll: true
      })
    } else {
      // Single operation
      const result = await this.wingsService.patch(id as Primitive, data, params as KnexParams)
      if (result === null) {
        throw new NotFound(`No record found for id '${id}'`)
      }
      return result
    }
  }

  async remove(id: Id, params?: FeathersParams): Promise<T>
  async remove(id: null, params?: FeathersParams): Promise<T[]>
  async remove(id: NullableId, params?: FeathersParams): Promise<T | T[]> {
    if (id === null) {
      // Bulk operation - map to removeMany
      return this.wingsService.removeMany({
        ...(params as KnexParams),
        allowAll: true
      })
    } else {
      // Single operation
      const result = await this.wingsService.remove(id as Primitive, params as KnexParams)
      if (result === null) {
        throw new NotFound(`No record found for id '${id}'`)
      }
      return result
    }
  }
}

// Export the FeathersJS adapter as the default for backwards compatibility
export { FeathersKnexAdapter as KnexService }
