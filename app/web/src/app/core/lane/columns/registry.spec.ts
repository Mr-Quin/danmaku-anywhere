import { CalendarColumn } from './calendar-column'
import { COLUMN_REGISTRY } from './registry'
import { TrendingColumn } from './trending-column'

/**
 * Verifies the column-body registry resolves every column kind to a wrapper
 * except onboarding (which is a route, not a column), so the body host only
 * falls back to the placeholder for onboarding. Spot-checks two wrappers.
 */
describe('COLUMN_REGISTRY', () => {
  it('maps trending and calendar to their wrappers', () => {
    expect(COLUMN_REGISTRY.trending).toBe(TrendingColumn)
    expect(COLUMN_REGISTRY.calendar).toBe(CalendarColumn)
  })

  it('maps every column kind except onboarding', () => {
    const mapped = Object.keys(COLUMN_REGISTRY).sort()
    expect(mapped).toEqual(
      [
        'calendar',
        'comments',
        'debug-video',
        'history',
        'local',
        'player',
        'playground',
        'rules',
        'search',
        'settings',
        'show',
        'showtab',
        'trending',
      ].sort()
    )
  })

  it('does not map onboarding (handled by its own route)', () => {
    expect(COLUMN_REGISTRY.onboarding).toBeUndefined()
  })
})
