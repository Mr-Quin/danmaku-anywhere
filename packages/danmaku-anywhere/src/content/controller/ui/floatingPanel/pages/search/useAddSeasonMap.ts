import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/common/components/Toast/toastStore'
import { seasonMapQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import type { SeasonMap } from '@/common/seasonMap/SeasonMap'

export const useAddSeasonMap = () => {
  const { t } = useTranslation()
  const toast = useToast.use.toast()

  return useMutation({
    mutationKey: seasonMapQueryKeys.all(),
    mutationFn: (seasonMap: SeasonMap) => {
      return chromeRpcClient.seasonMapAdd(seasonMap.toSnapshot())
    },
    onSuccess: () => {
      toast.success(
        t('searchPage.alert.mappingSuccess', 'Mapping saved successfully')
      )
    },
    onError: (e) => {
      toast.error(
        t(
          'searchPage.alert.mappingFailed',
          'Failed to save mapping：{{message}}',
          { message: e.message }
        )
      )
    },
  })
}
