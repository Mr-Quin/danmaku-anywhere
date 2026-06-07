import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toManifestLocale } from '@/common/localization/language'
import { sourceQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

export const useManifestSpec = (manifestId: string) => {
  const { i18n } = useTranslation()
  const locale = toManifestLocale(i18n.language)
  return useQuery({
    queryFn: () =>
      chromeRpcClient.providerGetManifestSpec({ manifestId, locale }),
    select: (res) => res.data,
    queryKey: sourceQueryKeys.manifestSpec(manifestId, locale),
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })
}
