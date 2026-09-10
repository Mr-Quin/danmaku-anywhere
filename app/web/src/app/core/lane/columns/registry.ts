import type { Type } from '@angular/core'

import type { ColumnKind } from '../lane.types'
import { CalendarColumn } from './calendar-column'
import { CommentsColumn } from './comments-column'
import { DebugVideoColumn } from './debug-video-column'
import { HistoryColumn } from './history-column'
import { LocalColumn } from './local-column'
import { PlayerColumn } from './player-column'
import { PlaygroundColumn } from './playground-column'
import { RulesColumn } from './rules-column'
import { SearchColumn } from './search-column'
import { SettingsColumn } from './settings-column'
import { ShowColumn } from './show-column'
import { ShowtabColumn } from './showtab-column'
import { TrendingColumn } from './trending-column'

// Single shared wiring file: each kind maps to its column wrapper. Unmapped
// kinds fall back to PlaceholderColumn in the body host. The onboarding kind
// is handled by its own route, not a column.
export const COLUMN_REGISTRY: Partial<Record<ColumnKind, Type<unknown>>> = {
  trending: TrendingColumn,
  calendar: CalendarColumn,
  show: ShowColumn,
  showtab: ShowtabColumn,
  comments: CommentsColumn,
  search: SearchColumn,
  rules: RulesColumn,
  history: HistoryColumn,
  settings: SettingsColumn,
  player: PlayerColumn,
  local: LocalColumn,
  'debug-video': DebugVideoColumn,
  playground: PlaygroundColumn,
}
