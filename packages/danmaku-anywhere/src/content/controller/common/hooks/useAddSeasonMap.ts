import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/common/components/Toast/toastStore'
import type { SeasonMap } from '@/common/db/db'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

export const useAddSeasonMap = () => {
  const { t } = useTranslation()
  const toast = useToast.use.toast()

  return useMutation({
    mutationFn: (seasonMap: SeasonMap) => {
      return chromeRpcClient.seasonMapAdd(seasonMap)
    },
    onSuccess: () => {
      toast.success(t('searchPage.alert.mappingSuccess'))
    },
    onError: (e) => {
      toast.error(t('searchPage.alert.mappingFailed', { message: e.message }))
    },
  })
}
