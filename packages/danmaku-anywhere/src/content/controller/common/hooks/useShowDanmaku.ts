import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { useToast } from '@/common/components/Toast/toastStore'
import { formatHotkeyCombo } from '@/common/options/extensionOptions/hotkeys'
import { useHotkeyOptions } from '@/common/options/extensionOptions/useHotkeyOptions'
import { playerRpcClient } from '@/common/rpcClient/background/client'
import { getOS } from '@/common/utils/utils'
import { useStore } from '@/content/controller/store/store'

const VISIBILITY_TOAST_DURATION_MS = 2000

export const useShowDanmaku = () => {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { isVisible, toggleVisible } = useStore.use.danmaku()
  const { getKeyCombo } = useHotkeyOptions()

  const { getActiveFrame } = useStore.use.frame()

  const visibilityMessage = (visible: boolean) => {
    if (visible) {
      return t('danmaku.alert.shown', 'Danmaku shown')
    }
    const combo = getKeyCombo('toggleEnableDanmaku')
    if (!combo) {
      return t('danmaku.alert.hidden', 'Danmaku hidden')
    }
    return t(
      'danmaku.alert.hiddenWithHotkey',
      'Danmaku hidden ({{hotkey}} to show)',
      {
        hotkey: formatHotkeyCombo(combo, { isMacOs: getOS() === 'MacOS' }),
      }
    )
  }

  return useMutation({
    mutationFn: async () => {
      const activeFrame = getActiveFrame()
      if (!activeFrame) {
        throw new Error('No active frame')
      }
      await playerRpcClient.player['relay:command:show']({
        frameId: activeFrame.frameId,
        data: !isVisible,
      })
      return !isVisible
    },
    onSuccess: (visible) => {
      toggleVisible(visible)
      toast.info(visibilityMessage(visible), {
        duration: VISIBILITY_TOAST_DURATION_MS,
      })
    },
    onError: (err) => {
      toast.error(err.message)
    },
  })
}
