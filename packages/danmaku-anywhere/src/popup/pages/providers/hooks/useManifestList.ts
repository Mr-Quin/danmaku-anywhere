import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toManifestLocale } from '@/common/localization/language'
import { sourceQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

export const useManifestList = () => {
  const { i18n } = useTranslation()
  const locale = toManifestLocale(i18n.language)
  return useQuery({
    queryFn: () => chromeRpcClient.providerListManifests({ locale }),
    select: (res) => res.data,
    queryKey: sourceQueryKeys.manifestList(locale),
    refetchOnWindowFocus: false,
  })
}

export const useRefreshCatalog = () => {
  const queryClient = useQueryClient()
  const { i18n } = useTranslation()
  const locale = toManifestLocale(i18n.language)
  return useMutation({
    mutationFn: () => chromeRpcClient.providerRefreshCatalog({ locale }),
    onSuccess: (res) => {
      queryClient.setQueryData(sourceQueryKeys.manifestList(locale), res)
      // A refresh re-checks the catalog, which can change the pending set.
      void queryClient.invalidateQueries({
        queryKey: sourceQueryKeys.pendingUpdates(),
      })
    },
  })
}
