import { KnexParams } from './index'
import { safeQueryExecution } from './utils'

export interface BulkOperationHelpers<T> {
  find(params: KnexParams & { paginate?: false }): Promise<T[]>
  getOptions(params?: KnexParams): { name: string; id: string }
  db(params?: KnexParams): any
}

export async function findItemsForBulkOperation<T>(
  adapter: BulkOperationHelpers<T>,
  params: KnexParams & { allowAll?: boolean }
): Promise<{ items: T[]; idList: any[] }> {
  const items = await adapter.find({ ...params, paginate: false })
  const { id: idField } = adapter.getOptions(params)
  const idList = items.map((current: any) => current[idField])

  return { items, idList }
}

export async function executeBulkUpdate<T>(
  adapter: BulkOperationHelpers<T>,
  data: Partial<T>,
  params: KnexParams,
  idList: any[]
): Promise<T[]> {
  const { name, id: idField } = adapter.getOptions(params)
  const { errorHandler } = await import('./error-handler')

  // Update records
  await safeQueryExecution(
    adapter.db(params).whereIn(`${name}.${idField}`, idList).update(data),
    errorHandler
  )

  // Return updated records
  return adapter.find({
    ...params,
    query: { [`${name}.${idField}`]: { $in: idList } },
    paginate: false
  })
}

export async function executeBulkDelete<T>(
  adapter: BulkOperationHelpers<T>,
  params: KnexParams,
  items: T[]
): Promise<T[]> {
  const { name, id: idField } = adapter.getOptions(params)
  const idList = items.map((current: any) => current[idField])
  const { errorHandler } = await import('./error-handler')

  // Delete records
  await safeQueryExecution(adapter.db(params).whereIn(`${name}.${idField}`, idList).del(), errorHandler)

  return items
}
