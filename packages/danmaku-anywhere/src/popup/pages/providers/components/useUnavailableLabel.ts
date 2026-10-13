import { useTranslation } from 'react-i18next'
import type { ManifestUnavailableReason } from '@/common/rpcClient/background/types'

export function useUnavailableLabel(): (
  reason: ManifestUnavailableReason
) => string {
  const { t } = useTranslation()
  return (reason) => {
    switch (reason) {
      case 'needs-newer-extension':
        return t(
          'providers.unavailable.needsNewerExtension',
          'Needs a newer version of the extension'
        )
      case 'invalid':
        return t('providers.unavailable.invalid', 'Cannot be loaded')
    }
  }
}
