import type { TFunction } from 'i18next'
import type { FieldAccentKey } from '@/common/theme/sakura'

export type FieldId = FieldAccentKey

export const FIELD_ORDER: readonly FieldId[] = [
  'title',
  'season',
  'episode',
  'episodeTitle',
] as const

export function getFieldLabel(t: TFunction, id: FieldId): string {
  switch (id) {
    case 'title':
      return t('editMode.field.title', 'Title')
    case 'season':
      return t('editMode.field.season', 'Season')
    case 'episode':
      return t('editMode.field.episode', 'Episode')
    case 'episodeTitle':
      return t('editMode.field.episodeTitle', 'Episode title')
  }
}
