import { CalendarColumn } from './calendar-column'
import { COLUMN_REGISTRY } from './registry'
import { TrendingColumn } from './trending-column'

/**
 * Verifies the column-body registry is the flat, single-source map fan-out
 * agents extend: trending and calendar resolve to their wrappers, every other
 * kind is intentionally unmapped (the body host falls back to the placeholder),
 * and the map exposes no surprise entries.
 */
describe('COLUMN_REGISTRY', () => {
  it('maps trending and calendar to their wrappers', () => {
    expect(COLUMN_REGISTRY.trending).toBe(TrendingColumn)
    expect(COLUMN_REGISTRY.calendar).toBe(CalendarColumn)
  })

  it('leaves the not-yet-adapted kinds unmapped', () => {
    expect(COLUMN_REGISTRY.show).toBeUndefined()
    expect(COLUMN_REGISTRY.player).toBeUndefined()
    expect(COLUMN_REGISTRY.search).toBeUndefined()
    expect(COLUMN_REGISTRY.settings).toBeUndefined()
  })

  it('only exposes the two adapted exemplar kinds', () => {
    expect(Object.keys(COLUMN_REGISTRY).sort()).toEqual([
      'calendar',
      'trending',
    ])
  })
})
