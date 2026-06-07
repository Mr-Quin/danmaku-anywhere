import { useTranslation } from 'react-i18next'
import { toManifestLocale } from '@/common/localization/language'

// Resolve the active UI language to a locale tag once, so the query key and
// the RPC arg stay in sync.
export const useManifestLocale = (): string => {
  const { i18n } = useTranslation()
  return toManifestLocale(i18n.language)
}
