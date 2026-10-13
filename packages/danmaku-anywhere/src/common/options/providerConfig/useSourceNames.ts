import { useQuery } from '@tanstack/react-query'
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

// Names fall back to manifest ids until the background answers, or when it
// cannot, so a surface that names sources never waits on or fails with this.
export function useManifestNames(): ManifestNames {
  const { i18n } = useTranslation()
  const locale = toManifestLocale(i18n.language)
  const { data } = useQuery({
    queryKey: sourceQueryKeys.manifestNames(locale),
    queryFn: async () => {
      return (await chromeRpcClient.providerListManifestNames({ locale })).data
    },
    refetchOnWindowFocus: false,
  })
  return useMemo(() => new Map(Object.entries(data ?? {})), [data])
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
