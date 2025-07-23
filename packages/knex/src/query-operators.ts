import { Knex } from 'knex'

export const QUERY_METHODS = {
  $ne: 'whereNot',
  $in: 'whereIn',
  $nin: 'whereNotIn',
  $or: 'orWhere',
  $and: 'andWhere'
} as const

export const QUERY_OPERATORS = {
  $lt: '<',
  $lte: '<=',
  $gt: '>',
  $gte: '>=',
  $like: 'like',
  $notlike: 'not like',
  $ilike: 'ilike',
  $isNull: 'is null'
} as const

export function handleSpecialOperators(
  builder: Knex.QueryBuilder,
  key: string,
  value: any,
  column: string
): Knex.QueryBuilder | null {
  // Handle $isNull operator
  if (key === '$isNull') {
    return value ? builder.whereNull(column) : builder.whereNotNull(column)
  }

  // Handle $ilike operator (case-insensitive LIKE)
  if (key === '$ilike') {
    return handleIlikeOperator(builder, column, value)
  }

  return null
}

function handleIlikeOperator(builder: Knex.QueryBuilder, column: string, value: any): Knex.QueryBuilder {
  const dbClient = builder.client.driverName

  if (dbClient === 'sqlite3' || dbClient === 'better-sqlite3') {
    // SQLite doesn't support ILIKE, use LIKE with UPPER()
    return builder.whereRaw(`UPPER(${column}) LIKE UPPER(?)`, [value])
  } else if (dbClient === 'mysql' || dbClient === 'mysql2') {
    // MySQL LIKE is case-insensitive by default with default collation
    return builder.where(column, 'like', value)
  } else {
    // PostgreSQL and other databases support ilike
    return builder.where(column, 'ilike', value)
  }
}

export function handleComplexOperators(
  builder: Knex.QueryBuilder,
  key: string,
  value: any,
  knexifyCallback: (builder: Knex.QueryBuilder, query: any) => void
): Knex.QueryBuilder | null {
  const method = QUERY_METHODS[key as keyof typeof QUERY_METHODS]

  if (!method) return null

  if (key === '$or' || key === '$and') {
    // Handle complex logical operators
    builder.where(function (this: any) {
      for (const condition of value) {
        this[method](function (this: Knex.QueryBuilder) {
          knexifyCallback(this, condition)
        })
      }
    })
    return builder
  }

  return null
}
