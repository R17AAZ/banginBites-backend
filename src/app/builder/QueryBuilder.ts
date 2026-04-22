import { Prisma } from '@prisma/client'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Removes null, undefined, empty string, empty array and empty object values. */
function cleanObject(obj: Record<string, any>): Record<string, any> {
  const cleaned: Record<string, any> = {}
  for (const key in obj) {
    const value = obj[key]
    if (
      value !== null &&
      value !== undefined &&
      value !== '' &&
      value !== 'undefined' &&
      !(Array.isArray(value) && value.length === 0) &&
      !(
        typeof value === 'object' &&
        !Array.isArray(value) &&
        Object.keys(value).length === 0
      )
    ) {
      cleaned[key] = value
    }
  }
  return cleaned
}

// ─── QueryBuilder ─────────────────────────────────────────────────────────────
class QueryBuilder {
  public query: Record<string, unknown>
  public prismaQuery: any = {
    where: {},
    include: undefined,
    select: undefined,
    orderBy: {},
    skip: undefined,
    take: undefined,
  }

  constructor(query: Record<string, unknown>) {
    this.query = query
  }

  /** Full-text search across specified fields (case-insensitive). */
  search(searchableFields: string[]) {
    if (this?.query?.searchTerm) {
      const searchTerm = this.query.searchTerm as string
      this.prismaQuery.where = {
        ...this.prismaQuery.where,
        OR: searchableFields.map(field => ({
          [field]: {
            contains: searchTerm,
            mode: 'insensitive',
          },
        })),
      }
    }
    return this
  }

  /** Filter by arbitrary query params (excludes reserved keys). */
  filter() {
    const queryObj = { ...this.query }
    const excludeFields = [
      'searchTerm',
      'sort',
      'page',
      'limit',
      'fields',
      'include',
    ]
    excludeFields.forEach(el => delete queryObj[el])

    const cleanedFilters = cleanObject(queryObj)
    
    // Simple equality filters
    Object.keys(cleanedFilters).forEach(key => {
        this.prismaQuery.where[key] = cleanedFilters[key]
    })

    return this
  }

  /** Sort results. */
  sort(allowedFields?: string[]) {
    const rawSort = (this?.query?.sort as string) || 'createdAt'
    const sortOrder = rawSort.startsWith('-') ? 'desc' : 'asc'
    const fieldName = rawSort.startsWith('-') ? rawSort.slice(1) : rawSort

    const finalFieldName =
      allowedFields && allowedFields.length
        ? allowedFields.includes(fieldName)
          ? fieldName
          : 'createdAt'
        : fieldName

    this.prismaQuery.orderBy = {
      [finalFieldName]: sortOrder,
    }
    return this
  }

  /** Paginate results. */
  paginate() {
    const MAX_LIMIT = 100
    const limit = Math.min(Number(this?.query?.limit) || 10, MAX_LIMIT)
    const page = Math.max(Number(this?.query?.page) || 1, 1)
    const skip = (page - 1) * limit

    this.prismaQuery.skip = skip
    this.prismaQuery.take = limit
    return this
  }

  /** Project specific fields. Note: Prisma doesn't support mixing select and include. */
  fields() {
    if (this?.query?.fields) {
      const fields = (this.query.fields as string).split(',')
      const selectObj: Record<string, boolean> = {}
      fields.forEach(f => {
        selectObj[f.trim()] = true
      })
      this.prismaQuery.select = selectObj
    }
    return this
  }

  /** Include relations. */
  include(includeObj: any) {
    this.prismaQuery.include = includeObj
    return this
  }

  /** Returns the built Prisma query arguments. */
  build() {
    return cleanObject(this.prismaQuery)
  }
}

export default QueryBuilder