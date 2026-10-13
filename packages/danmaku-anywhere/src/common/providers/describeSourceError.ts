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
    case 'noUrlParser':
      return i18n.t('searchPage.parse.noSource', 'No source can read this link')
    case 'episodesUnsupported':
      return i18n.t(
        'providers.error.episodesUnsupported',
        '{{name}} cannot list episodes',
        { name: sourceError.sourceName }
      )
    case 'refetchUnsupported':
      return i18n.t(
        'providers.error.refetchUnsupported',
        '{{name}} cannot fetch danmaku for saved episodes again',
        { name: sourceError.sourceName }
      )
    default:
      return error instanceof Error ? error.message : String(error)
  }
}
