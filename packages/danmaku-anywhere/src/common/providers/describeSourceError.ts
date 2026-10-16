import { i18n } from '@/common/localization/i18n'
import { getSourceError } from './SourceError'

export function describeSourceError(error: unknown): string {
  const sourceError = getSourceError(error)
  switch (sourceError?.problem) {
    case 'sourceRemoved':
      return i18n.t(
        'anime.sourceRemovedTooltip',
        'This source has been deleted.'
      )
    case 'sourceUnavailable':
      return i18n.t(
        'providers.error.sourceUnavailable',
        "{{name}} can't be used right now",
        { name: sourceError.sourceName }
      )
    case 'noUrlParser':
      return i18n.t('searchPage.parse.noSource', 'No source can read this link')
    case 'searchUnsupported':
      return i18n.t(
        'providers.error.searchUnsupported',
        '{{name}} cannot search',
        { name: sourceError.sourceName }
      )
    case 'episodesUnsupported':
      return i18n.t(
        'providers.error.episodesUnsupported',
        '{{name}} cannot list episodes',
        { name: sourceError.sourceName }
      )
    case 'danmakuUnsupported':
      return i18n.t(
        'providers.error.danmakuUnsupported',
        '{{name}} cannot fetch danmaku',
        { name: sourceError.sourceName }
      )
    case 'seasonRefreshUnsupported':
      return i18n.t(
        'providers.error.seasonRefreshUnsupported',
        '{{name}} cannot refresh season details',
        { name: sourceError.sourceName }
      )
    default:
      return error instanceof Error ? error.message : String(error)
  }
}
