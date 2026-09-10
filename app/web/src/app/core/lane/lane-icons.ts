import type { ColumnKind } from './lane.types'

// PrimeIcons class for each column kind, used by the waybar, sidebar, and
// column header so the lane uses one cohesive icon set.
export const KIND_ICON: Record<ColumnKind, string> = {
  trending: 'pi-chart-line',
  calendar: 'pi-calendar',
  search: 'pi-search',
  rules: 'pi-list',
  history: 'pi-history',
  settings: 'pi-cog',
  show: 'pi-info-circle',
  showtab: 'pi-tags',
  comments: 'pi-comments',
  player: 'pi-play',
  local: 'pi-folder',
  onboarding: 'pi-compass',
  'debug-video': 'pi-video',
  playground: 'pi-wrench',
}

export function iconFor(kind: ColumnKind): string {
  return KIND_ICON[kind] ?? 'pi-circle'
}
