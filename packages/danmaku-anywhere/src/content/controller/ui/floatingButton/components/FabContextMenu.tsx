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

import { useHotkeyOptions } from '@/common/options/extensionOptions/useHotkeyOptions'
import { playerRpcClient } from '@/common/rpcClient/background/client'
import { useLoadDanmaku } from '@/content/controller/common/hooks/useLoadDanmaku'
import { useShowDanmaku } from '@/content/controller/common/hooks/useShowDanmaku'
import { useUnmountDanmaku } from '@/content/controller/common/hooks/useUnmountDanmaku'
import { useStore } from '@/content/controller/store/store'
import type { ContextMenuItemProps } from '@/content/controller/ui/floatingButton/components/ContextMenuItem'
import { ContextMenuItem } from '@/content/controller/ui/floatingButton/components/ContextMenuItem'
import { ContextMenuShortcut } from '@/content/controller/ui/floatingButton/components/ContextMenuShortcut'

type FabContextMenuProps = PopperProps

const usePip = () => {
  const { activeFrame } = useStore.use.frame()

  const enterPip = () => {
    if (activeFrame === undefined) return
    playerRpcClient.player['relay:command:enterPip']({
      frameId: activeFrame.frameId,
    })
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
