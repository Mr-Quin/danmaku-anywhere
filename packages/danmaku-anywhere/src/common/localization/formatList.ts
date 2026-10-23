import { i18n } from './i18n'

export function formatList(items: string[]): string {
  return new Intl.ListFormat(i18n.language, { type: 'conjunction' }).format(
    items
  )
}
