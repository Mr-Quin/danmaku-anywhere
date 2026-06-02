import type { ColumnKind } from './lane.types'

export const DEFAULT_WIDTH: Record<ColumnKind, number> = {
  trending: 820,
  show: 440,
  player: 768,
  search: 468,
  calendar: 540,
  rules: 460,
  history: 440,
  settings: 560,
  comments: 380,
  showtab: 400,
  local: 768,
  onboarding: 560,
  'debug-video': 768,
  playground: 768,
}

export const WIDTH_STEPS: Partial<Record<ColumnKind, number[]>> & {
  _: number[]
} = {
  trending: [560, 820, 1080],
  show: [360, 440, 580],
  player: [600, 768, 1000],
  search: [380, 468, 620],
  comments: [320, 380, 520],
  showtab: [340, 440, 600],
  _: [380, 480, 640],
}

export const DEFAULT_LANDING: ColumnKind = 'trending'

export const EXT_REQUIRED_KINDS = new Set<ColumnKind>([
  'trending',
  'calendar',
  'show',
  'showtab',
  'comments',
  'search',
  'rules',
  'player',
  'debug-video',
])
