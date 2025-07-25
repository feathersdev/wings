import { BadRequest } from '@feathersjs/errors'
import type {
  AdapterOptions,
  AdapterParams,
  Paginated,
  Primitive,
  WingsAdapterInterface
} from './declarations'

/**
 * Base class for Wings adapters providing common functionality
 */
export abstract class AdapterBase<
  Result = unknown,
  Data = Partial<Result>,
  PatchData = Partial<Data>,
  Options extends AdapterOptions = AdapterOptions,
  Params extends AdapterParams<any> = AdapterParams<any>
> implements WingsAdapterInterface<Result, Data, PatchData, Options, Params>
{
  options: Options

  constructor(settings: Partial<Options> & { id?: string }) {
    this.options = {
      id: 'id',
      ...settings
    } as Options
  }

  get id() {
    return this.options.id
  }

  /**
   * Separates query operators from filters
   */
  protected filterQuery(params?: Params): {
    filters: {
      $select?: any[]
      $sort?: any
      $limit?: number
      $skip?: number
    }
    query: any
  } {
    const { $select, $sort, $limit = null, $skip = 0, ...query } = params?.query || {}
    return {
      filters: { $select, $sort, $limit, $skip },
      query
    }
  }

  /**
   * Validates that an ID is not null/undefined for single operations
   */
  protected validateNonNullId(id: Primitive, operation: string): void {
    if (id === null || id === undefined) {
      throw new BadRequest(
        `${operation}() requires a non-null id. Use ${operation}Many() for bulk ${operation}s.`
      )
    }
  }

  /**
   * Validates bulk operation parameters
   */
  protected validateBulkParams(query: any, allowAll: boolean | undefined, operation: string): void {
    if (!query || Object.keys(query).length === 0) {
      if (!allowAll) {
        throw new BadRequest(
          `No query provided and allowAll is not set. Use allowAll: true to ${operation} all records.`
        )
      }
    }
  }

  /**
   * Builds a paginated result object
   */
  protected buildPaginatedResult(data: Result[], total: number, filters: any): Paginated<Result> {
    return {
      total,
      limit: filters.$limit || 0,
      skip: filters.$skip || 0,
      data
    }
  }

  /**
   * Converts SQL-like operators to regex patterns for in-memory/non-SQL databases
   * This is optional - SQL adapters won't use this method
   */
  protected convertSqlLikeOperators(query: any): any {
    if (!query || typeof query !== 'object') {
      return query
    }

    const converted = { ...query }

    Object.keys(converted).forEach((key) => {
      const value = converted[key]

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const convertedValue = { ...value }

        Object.keys(convertedValue).forEach((op) => {
          const opValue = convertedValue[op]

          if (op === '$like' && typeof opValue === 'string') {
            delete convertedValue[op]
            const regexPattern = this.convertLikeToRegex(opValue)
            convertedValue.$regex = new RegExp(`^${regexPattern}$`)
          } else if (op === '$notlike' && typeof opValue === 'string') {
            delete convertedValue[op]
            const regexPattern = this.convertLikeToRegex(opValue)
            convertedValue.$not = new RegExp(`^${regexPattern}$`)
          } else if (op === '$ilike' && typeof opValue === 'string') {
            delete convertedValue[op]
            const regexPattern = this.convertLikeToRegex(opValue)
            convertedValue.$regex = new RegExp(`^${regexPattern}$`, 'i')
          } else if (op === '$isNull') {
            delete convertedValue[op]
            if (opValue === true) {
              convertedValue.$eq = null
            } else if (opValue === false) {
              convertedValue.$ne = null
            }
          }
        })

        converted[key] = convertedValue
      } else if (key === '$or' || key === '$and') {
        // Recursively convert operators in $or and $and arrays
        converted[key] = value.map((item: any) => this.convertSqlLikeOperators(item))
      }
    })

    return converted
  }

  /**
   * Converts SQL LIKE patterns to JavaScript regex
   */
  private convertLikeToRegex(pattern: string): string {
    return pattern
      .replace(/([.+*?^${}()|[\]\\])/g, '\\$1') // Escape regex special chars
      .replace(/%/g, '.*') // Convert % to .*
      .replace(/_/g, '.') // Convert _ to .
  }

  // Abstract methods that must be implemented by subclasses
  abstract find(params?: Params & { paginate?: false }): Promise<Result[]>
  abstract find(params: Params & { paginate: true }): Promise<Paginated<Result>>
  abstract find(params?: Params): Promise<Result[] | Paginated<Result>>

  abstract get(id: Primitive, params?: Params): Promise<Result | null>

  abstract create(data: Data[], params?: Params): Promise<Result[]>
  abstract create(data: Data, params?: Params): Promise<Result>
  abstract create(data: Data | Data[], params?: Params): Promise<Result | Result[]>

  abstract patch(id: Primitive, data: PatchData, params?: Params): Promise<Result | null>
  abstract patchMany(data: PatchData, params: Params & { allowAll?: boolean }): Promise<Result[]>

  abstract remove(id: Primitive, params?: Params): Promise<Result | null>
  abstract removeMany(params: Params & { allowAll?: boolean }): Promise<Result[]>
  abstract removeAll(params?: Params): Promise<Result[]>
}
