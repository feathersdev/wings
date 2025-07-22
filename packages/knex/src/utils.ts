/**
 * Extract and normalize count value from Knex count query result
 */
export function extractCountValue(countResult: any[]): number {
  if (!countResult || countResult.length === 0 || !countResult[0]) {
    return 0
  }

  const countValue = countResult[0].total

  if (typeof countValue === 'number') {
    return countValue
  }

  if (typeof countValue === 'string') {
    const parsed = parseInt(countValue, 10)
    return isNaN(parsed) ? 0 : parsed
  }

  // Try to coerce other types to number
  const coerced = Number(countValue)
  return isNaN(coerced) ? 0 : coerced
}

/**
 * Safely execute a query with error handling
 */
export async function safeQueryExecution<T>(
  queryBuilder: any,
  errorHandler: (error: any) => any
): Promise<T> {
  return queryBuilder.catch(errorHandler)
}

/**
 * Create full table name with optional schema
 */
export function createFullTableName(name: string, schema?: string): string {
  return schema ? `${schema}.${name}` : name
}

/**
 * Validate required bulk operation parameters
 */
export function validateBulkOperationParams(
  query: any,
  allowAll: boolean | undefined,
  operation: string
): void {
  if (!query && !allowAll) {
    throw new Error(`No query provided. Use allowAll: true to ${operation} all records`)
  }
}
