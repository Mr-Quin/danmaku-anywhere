import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { useToast } from '@/common/components/Toast/toastStore'
import { sendUnmount } from '@/content/controller/common/danmakuCommands'

interface UnmountDanmakuOptions {
  silent?: boolean
}

export const useUnmountDanmaku = ({
  silent = false,
}: UnmountDanmakuOptions = {}) => {
  const { toast } = useToast()
  const { t } = useTranslation()

  return useMutation({
    mutationFn: async (frameId: number | void) => {
      await sendUnmount(frameId ?? undefined)
      return true
    },
    onSuccess: () => {
      if (!silent) {
        toast.info(t('danmaku.alert.unmounted', 'Danmaku Unmounted'))
      }
    },
    onError: (err) => {
      if (!silent) {
        toast.error(err.message)
      }
    },
  })
}
