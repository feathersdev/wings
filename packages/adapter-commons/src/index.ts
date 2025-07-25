import { _ } from '@feathersjs/commons'

export * from './declarations'
export * from './sort'
export * from './adapter-base'

// Return a function that filters a result object or array
// and picks only the fields passed as `params.query.$select`
// and additional `otherFields`
export function select(params: any, ...otherFields: string[]) {
  const queryFields: string[] | undefined = params?.query?.$select

  if (!queryFields) {
    return (result: any) => result
  }

  const resultFields = queryFields.concat(otherFields)
  const convert = (result: any) => _.pick(result, ...resultFields)

  return (result: any) => {
    if (Array.isArray(result)) {
      return result.map(convert)
    }

    return convert(result)
  }
}
