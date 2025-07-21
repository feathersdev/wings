export type Person = {
  [key: string]: any
  name: string
  age: number | null
  created?: boolean
}

// Base interface that both Wings and FeathersJS adapters should support
export interface BaseAdapter<T = any> {
  find(params?: any): Promise<T[] | any>
  get(id: any, params?: any): Promise<T | null | any>
  create(data: Partial<T> | Partial<T>[], params?: any): Promise<T | T[]>
  patch(id: any, data: Partial<T>, params?: any): Promise<T | T[] | null>
  remove(id: any, params?: any): Promise<T | T[] | null>
}

// Wings-specific interface extensions
export interface WingsAdapter<T = any> extends BaseAdapter<T> {
  patchMany(data: Partial<T>, params?: any): Promise<T[]>
  removeMany(params?: any): Promise<T[]>
  removeAll(): Promise<T[]>
}

// FeathersJS-specific interface extensions
export interface FeathersAdapter<T = any> extends BaseAdapter<T> {
  update(id: any, data: T, params?: any): Promise<T>
}

// Configuration for test behavior
export interface TestConfig {
  // Error handling behavior
  throwOnNotFound?: boolean

  // Pagination behavior
  alwaysPaginate?: boolean

  // Query operators supported
  supportsLike?: boolean
  supportsIlike?: boolean
  supportsIsNull?: boolean

  // Bulk operation behavior
  supportsBulkViaNull?: boolean
  supportsPatchMany?: boolean
  supportsRemoveMany?: boolean
  supportsRemoveAll?: boolean
  supportsUpdate?: boolean
}

// Default configurations for different interfaces
export const WINGS_CONFIG: TestConfig = {
  throwOnNotFound: false,
  alwaysPaginate: false,
  supportsLike: true,
  supportsIlike: true,
  supportsIsNull: true,
  supportsBulkViaNull: false,
  supportsPatchMany: true,
  supportsRemoveMany: true,
  supportsRemoveAll: true,
  supportsUpdate: false
}

export const FEATHERS_CONFIG: TestConfig = {
  throwOnNotFound: true,
  alwaysPaginate: true,
  supportsLike: false,
  supportsIlike: false,
  supportsIsNull: false,
  supportsBulkViaNull: true,
  supportsPatchMany: false,
  supportsRemoveMany: false,
  supportsRemoveAll: false,
  supportsUpdate: true
}

export const COMMON_CONFIG: TestConfig = {
  throwOnNotFound: false, // Will be overridden by specific configs
  alwaysPaginate: false, // Will be overridden by specific configs
  supportsLike: false, // Only test common operators
  supportsIlike: false,
  supportsIsNull: false,
  supportsBulkViaNull: false,
  supportsPatchMany: false,
  supportsRemoveMany: false,
  supportsRemoveAll: false,
  supportsUpdate: false
}
