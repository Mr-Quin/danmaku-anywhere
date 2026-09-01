export type DetailsTab =
  | 'comments'
  | 'episodes'
  | 'characters'
  | 'staff'
  | 'relations'
  | 'recommendations'
  | 'reviews'
  | 'topics'

const DETAILS_TABS: readonly DetailsTab[] = [
  'comments',
  'episodes',
  'characters',
  'staff',
  'relations',
  'recommendations',
  'reviews',
  'topics',
]

export function isDetailsTab(value: unknown): value is DetailsTab {
  return typeof value === 'string' && DETAILS_TABS.includes(value as DetailsTab)
}
