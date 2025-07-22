import { BadRequest } from '@feathersjs/errors'
import { Primitive } from '@wingshq/adapter-commons'

/**
 * Validate that an ID is not null for single operations
 */
export function validateNonNullId(id: Primitive, operation: string): void {
  if (id === null || id === undefined) {
    throw new BadRequest(`${operation}() requires a non-null id. Use ${operation}Many() for bulk operations.`)
  }
}

/**
 * Validate bulk operation parameters
 */
export function validateBulkParams(query: any, allowAll: boolean | undefined, operation: string): void {
  if (!query && !allowAll) {
    throw new BadRequest(`No query provided. Use allowAll: true to ${operation} all records`)
  }
}

/**
 * Validate adapter construction parameters
 */
export function validateAdapterSettings(settings: any): void {
  if (!settings || !settings.Model) {
    throw new Error('You must provide a Model (the initialized Knex object)')
  }

  if (typeof settings.name !== 'string') {
    throw new Error('No table name specified.')
  }
}
