import type { Type } from '@angular/core'

import type { ColumnKind } from '../lane.types'
import { CalendarColumn } from './calendar-column'
import { TrendingColumn } from './trending-column'

// Single shared wiring file: each kind maps to its column wrapper. Fan-out
// agents add one entry here per kind. Unmapped kinds fall back to
// PlaceholderColumn in the body host.
export const COLUMN_REGISTRY: Partial<Record<ColumnKind, Type<unknown>>> = {
  trending: TrendingColumn,
  calendar: CalendarColumn,
}
