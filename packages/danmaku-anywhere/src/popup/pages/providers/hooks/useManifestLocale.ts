import { useTranslation } from 'react-i18next'
import { toManifestLocale } from '@/common/localization/language'

// Resolves the active UI language to the locale tag manifest display strings
// are keyed by, so the query key and the RPC arg never diverge.
export const useManifestLocale = (): string => {
  const { i18n } = useTranslation()
  return toManifestLocale(i18n.language)
}
