import { useTranslation } from 'react-i18next'
import type {
  ManifestUnavailableReason,
  ProviderManifestInfo,
} from '@/common/rpcClient/background/types'

// Describes a manifest that cannot run as stored, or undefined when it runs
// as stored.
export function useManifestStateLabel(): (
  manifest: ProviderManifestInfo
) => string | undefined {
  const { t } = useTranslation()
  const reasonLabel = (reason: ManifestUnavailableReason) => {
    switch (reason) {
      case 'needs-newer-extension':
        return t(
          'providers.unavailable.needsNewerExtension',
          'Needs a newer version of the extension'
        )
      case 'invalid-manifest':
        return t('providers.unavailable.invalid', 'Cannot be loaded')
    }
  }
  return (manifest) => {
    if (manifest.unavailable !== undefined) {
      return reasonLabel(manifest.unavailable)
    }
    if (manifest.fallback !== undefined) {
      return t(
        'providers.unavailable.fallback',
        'Running the built-in copy. Stored copy: {{reason}}',
        { reason: reasonLabel(manifest.fallback) }
      )
    }
    return undefined
  }
}

// A stored built-in or catalog manifest that cannot run can be dropped so the
// bundled or catalog copy is installed again.
export function canReinstall(manifest?: ProviderManifestInfo): boolean {
  return manifest?.unavailable !== undefined && manifest.kind !== 'user'
}
