import { useSuspenseQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { toManifestLocale } from '@/common/localization/language'
import { sourceQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import type { ProviderConfig } from './schema'
import {
  defaultSourceName,
  type ManifestNames,
  sourceDisplayNames,
  sourceName,
} from './sourceName'
import { useProviderConfig } from './useProviderConfig'

type NamedConfig = Pick<ProviderConfig, 'manifestId' | 'customName'> & {
  id?: string
}

export function useManifestNames(): ManifestNames {
  const { i18n } = useTranslation()
  const locale = toManifestLocale(i18n.language)
  const { data } = useSuspenseQuery({
    queryKey: sourceQueryKeys.manifestList(locale),
    queryFn: () => chromeRpcClient.providerListManifests({ locale }),
    refetchOnWindowFocus: false,
  })
  return useMemo(() => {
    return new Map(
      data.data.manifests.map((manifest) => [manifest.id, manifest.name])
    )
  }, [data])
}

// Names for the sources as the UI shows them, in the UI language
export function useSourceNames() {
  const { configs } = useProviderConfig()
  const manifestNames = useManifestNames()

  return useMemo(() => {
    const displayNames = sourceDisplayNames(configs, manifestNames)
    return {
      nameOf: (config: NamedConfig): string => {
        const displayName =
          config.id === undefined ? undefined : displayNames.get(config.id)
        return displayName ?? sourceName(config, manifestNames)
      },
      defaultNameOf: (config: Pick<ProviderConfig, 'manifestId'>): string => {
        return defaultSourceName(config, manifestNames)
      },
    }
  }, [configs, manifestNames])
}
