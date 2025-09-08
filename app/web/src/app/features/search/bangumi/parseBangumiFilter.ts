import type { ComparisonOperator } from '../filter/comparison-selector.component'
import type { SearchFilterModel } from '../filter/search-filter-item.component'

export function parseBangumiFilter(raw: string): SearchFilterModel | null {
  const match = /^(>=|<=|>|=|<)(.+)$/.exec(raw)
  if (!match) {
    return null
  }
  const op = match[1] as ComparisonOperator
  const valueRaw = match[2]?.trim() ?? ''
  return { op, value: valueRaw }
}

export function parseBangumiFilterList(
  filterList: string[]
): SearchFilterModel[] {
  const result: SearchFilterModel[] = []

  for (const raw of filterList) {
    const filter = parseBangumiFilter(raw)
    if (!filter) {
      continue
    }
    result.push(filter)
  }
  return result
}
