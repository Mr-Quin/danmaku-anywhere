import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { useToast } from '@/common/components/Toast/toastStore'
import { sendUnmount } from '@/content/controller/common/danmakuCommands'
import { preemptAutomatic } from '@/content/controller/store/automaticPreemption'

// For an unmount the user asked for; it also stops automatic matching in
// flight from mounting again.
export const useUnmountDanmaku = () => {
  const { toast } = useToast()
  const { t } = useTranslation()

  return useMutation({
    mutationFn: async () => {
      preemptAutomatic()
      await sendUnmount()
      return true
    },
    onSuccess: () => {
      toast.info(t('danmaku.alert.unmounted', 'Danmaku Unmounted'))
    },
    onError: (err) => {
      toast.error(err.message)
    },
  })
}
