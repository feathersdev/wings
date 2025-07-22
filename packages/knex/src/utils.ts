/**
 * Extract and normalize count value from Knex count query result
 */
export function extractCountValue(countResult: any[]): number {
  if (!countResult || countResult.length === 0 || !countResult[0]) {
    return 0
  }

  const row = countResult[0]
  
  // Try different possible column names that Knex count() might return
  let countValue = row.total || row['count(*)'] || row['COUNT(*)'] || row.count
  
  // If we still don't have a value, check all keys in the row
  if (countValue === undefined) {
    const keys = Object.keys(row)
    for (const key of keys) {
      const value = row[key]
      if (typeof value === 'number' || (typeof value === 'string' && !isNaN(parseInt(value, 10)))) {
        countValue = value
        break
      }
    }
  }
  
  // If it's an object (like SQLite might return), try to extract the first numeric value
  if (countValue && typeof countValue === 'object') {
    const values = Object.values(countValue)
    countValue = values.find(v => typeof v === 'number' || typeof v === 'string')
  }

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
