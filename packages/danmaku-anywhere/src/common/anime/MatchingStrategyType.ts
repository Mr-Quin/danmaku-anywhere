import { i18n } from '../localization/i18n'

export type MatchingStrategyType = 'local' | 'mapping' | 'search'

export const MATCHING_STRATEGY_LABEL: {
  [key in MatchingStrategyType]: () => string
} = {
  local: () => i18n.t('anime.matchingStrategy.local', 'Local'),
  mapping: () => i18n.t('anime.matchingStrategy.mapping', 'Mapping'),
  search: () => i18n.t('anime.matchingStrategy.search', 'Search'),
} as const
