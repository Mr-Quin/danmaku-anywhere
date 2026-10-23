import { useTranslation } from 'react-i18next'
import type { SourceUnavailableReason } from '@/common/errors/AppError'
import { isLegacyMacCms } from '@/common/options/providerConfig/utils'
import type {
  ManifestUnavailableReason,
  ProviderManifestInfo,
} from '@/common/rpcClient/background/types'

export interface ManifestState {
  unavailable?: SourceUnavailableReason
  fallback?: ManifestUnavailableReason
}

// The state of the manifest a config runs on. Once the list has loaded, a
// manifest missing from it is not installed at all. Legacy MacCMS has no
// manifest, and before the list loads nothing is known.
export function manifestStateOf(
  manifestId: string,
  manifestById: Map<string, ProviderManifestInfo>,
  listLoaded: boolean
): ManifestState | undefined {
  const manifest = manifestById.get(manifestId)
  if (manifest !== undefined) {
    return manifest
  }
  if (!listLoaded || isLegacyMacCms({ manifestId })) {
    return undefined
  }
  return { unavailable: 'not-registered' }
}

// Describes a manifest that cannot run as stored, or undefined when it runs
// as stored.
export function useManifestStateLabel(): (
  manifest: ManifestState
) => string | undefined {
  const { t } = useTranslation()
  const reasonLabel = (reason: SourceUnavailableReason) => {
    switch (reason) {
      case 'not-registered':
        return t(
          'providers.unavailable.notRegistered',
          'Manifest not installed'
        )
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

// A broken stored built-in or catalog manifest can be replaced with the
// bundled or catalog copy. One written for a newer engine is kept for the
// build that can run it.
export function canReinstall(manifest?: ProviderManifestInfo): boolean {
  return (
    manifest?.unavailable === 'invalid-manifest' && manifest.kind !== 'user'
  )
}
