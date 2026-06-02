export type ColumnKind =
  | 'trending'
  | 'calendar'
  | 'search'
  | 'rules'
  | 'history'
  | 'settings'
  | 'show'
  | 'showtab'
  | 'comments'
  | 'player'
  | 'local'
  | 'onboarding'
  | 'debug-video'
  | 'playground'

export type DetailsTab =
  | 'comments'
  | 'episodes'
  | 'characters'
  | 'staff'
  | 'relations'
  | 'recommendations'
  | 'reviews'
  | 'topics'

interface ColumnBase {
  id: string
  width: number
  full?: boolean
}

export type Column = ColumnBase &
  (
    | { kind: 'trending' }
    | { kind: 'calendar' }
    | { kind: 'history' }
    | { kind: 'rules' }
    | { kind: 'settings' }
    | { kind: 'playground' }
    | { kind: 'debug-video' }
    | { kind: 'onboarding' }
    | { kind: 'local' }
    | { kind: 'search'; query?: string; policyName?: string }
    | { kind: 'show'; subjectId: number; sub?: string; tab?: DetailsTab }
    | { kind: 'showtab'; subjectId: number; sub?: string; tab: DetailsTab }
    | { kind: 'comments'; subjectId: number; sub?: string }
    | {
        kind: 'player'
        sub?: string
        subjectId?: number
        episodeType?: string
        query?: string
        url?: string
        policyName?: string
        playlist?: number
        episode?: number
      }
  )

export interface Playing {
  subjectId?: number
  title: string
  episode: number
  source: string
  url?: string
  policyName?: string
}

export interface PinnedItem {
  key: number
  title: string
}

// Theme is intentionally NOT part of lane state. ThemeService owns the
// color scheme as the single source of truth (it persists the choice and
// applies the html class before hydration).
export interface LaneState {
  columns: Column[]
  activeId: string | null
  playing: Playing | null
  floating: boolean
  danmakuOn: boolean
  pinned: PinnedItem[]
}
