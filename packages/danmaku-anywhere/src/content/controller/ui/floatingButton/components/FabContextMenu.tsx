import {
  Eject,
  PictureInPicture,
  Sync,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material'
import type { PopperProps } from '@mui/material'
import { MenuList, Paper, Popper } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useInjectService } from '@/common/hooks/useInjectService'
import { Logger } from '@/common/Logger'
import { useHotkeyOptions } from '@/common/options/extensionOptions/useHotkeyOptions'
import { playerRpcClient } from '@/common/rpcClient/background/client'
import { createPipWindow } from '@/content/common/pip/createPipWindow'
import { useLoadDanmaku } from '@/content/controller/common/hooks/useLoadDanmaku'
import { useShowDanmaku } from '@/content/controller/common/hooks/useShowDanmaku'
import { useUnmountDanmaku } from '@/content/controller/common/hooks/useUnmountDanmaku'
import { IframeResolver } from '@/content/controller/danmaku/frame/IframeResolver.service'
import { useStore } from '@/content/controller/store/store'
import type { ContextMenuItemProps } from '@/content/controller/ui/floatingButton/components/ContextMenuItem'
import { ContextMenuItem } from '@/content/controller/ui/floatingButton/components/ContextMenuItem'
import { ContextMenuShortcut } from '@/content/controller/ui/floatingButton/components/ContextMenuShortcut'

type FabContextMenuProps = PopperProps

const pipLogger = Logger.sub('[PiP]')

const usePip = () => {
  const { activeFrame } = useStore.use.frame()

  const iframeResolver = useInjectService(IframeResolver)

  const enterPip = async () => {
    if (activeFrame === undefined) return

    // Main frame — use legacy player-side PiP
    if (activeFrame.frameId === 0) {
      playerRpcClient.player['relay:command:enterPip']({
        frameId: activeFrame.frameId,
      })
      return
    }

    // Iframe — create PiP from controller (top frame)
    let iframe = iframeResolver.get(activeFrame.frameId)
    if (!iframe) {
      await iframeResolver.resolve()
      iframe = iframeResolver.get(activeFrame.frameId)
    }
    if (!iframe) {
      pipLogger.warn(
        `Could not find iframe element for frameId ${activeFrame.frameId}`
      )
      return
    }

    try {
      const pipWindow = await createPipWindow({
        width: iframe.clientWidth,
        height: iframe.clientHeight,
      })

      const originalParent = iframe.parentElement
      const nextSibling = iframe.nextSibling

      // Save original inline styles to restore later
      const originalWidth = iframe.style.width
      const originalHeight = iframe.style.height
      const originalBorder = iframe.style.border

      // Make iframe fill the PiP window
      iframe.style.setProperty('width', '100%', 'important')
      iframe.style.setProperty('height', '100%', 'important')
      iframe.style.setProperty('border', 'none', 'important')
      pipWindow.document.body.style.margin = '0'
      pipWindow.document.body.style.overflow = 'hidden'
      pipWindow.document.body.appendChild(iframe)

      pipWindow.addEventListener('pagehide', () => {
        // Restore original styles
        iframe.style.width = originalWidth
        iframe.style.height = originalHeight
        iframe.style.border = originalBorder

        if (originalParent) {
          originalParent.insertBefore(iframe, nextSibling)
        }
      })
    } catch (e) {
      pipLogger.error('Failed to create PiP window', e)
    }
  }

  return {
    enterPip,
  }
}

export const FabContextMenu = (props: FabContextMenuProps) => {
  const { t } = useTranslation()
  const { isMounted, isVisible } = useStore.use.danmaku()
  const { enterPip } = usePip()
  const hasVideo = useStore((state) => state.hasVideo)
  const unmountMutation = useUnmountDanmaku()
  const showDanmakuMutation = useShowDanmaku()

  const { refreshComments, loadMutation, canRefresh } = useLoadDanmaku()

  const { getKeyCombo } = useHotkeyOptions()

  const isLoading = loadMutation.isPending

  const menuItems: ContextMenuItemProps[] = [
    {
      action: () => refreshComments(),
      disabled: () => !canRefresh || isLoading,
      icon: () => <Sync fontSize="small" />,
      label: () => t('danmaku.refresh', 'Refresh Danmaku'),
      hotkey: getKeyCombo('refreshComments'),
    },
    {
      action: () => unmountMutation.mutate(),
      disabled: () => !isMounted,
      icon: () => <Eject fontSize="small" />,
      label: () => t('danmaku.unmount', 'Unmount'),
      hotkey: getKeyCombo('unmountComments'),
    },
    {
      action: () => showDanmakuMutation.mutate(),
      icon: () =>
        isVisible ? (
          <VisibilityOff fontSize="small" />
        ) : (
          <Visibility fontSize="small" />
        ),
      label: () =>
        isVisible
          ? t('danmaku.disable', 'Hide Danmaku')
          : t('danmaku.enable', 'Show Danmaku'),
      hotkey: getKeyCombo('toggleEnableDanmaku'),
    },
    {
      action: () => enterPip(),
      disabled: () => !hasVideo(),
      icon: () => <PictureInPicture fontSize="small" />,
      label: () => t('common.pip', 'Picture-in-Picture'),
      hotkey: getKeyCombo('togglePip'),
    },
  ]

  return (
    <Paper>
      {menuItems.map((item, i) => (
        <ContextMenuShortcut key={i} {...item} />
      ))}
      <Popper placement="top-end" {...props}>
        <Paper>
          <MenuList dense>
            {menuItems.map((item, i) => (
              <ContextMenuItem key={i} {...item} />
            ))}
          </MenuList>
        </Paper>
      </Popper>
    </Paper>
  )
}
