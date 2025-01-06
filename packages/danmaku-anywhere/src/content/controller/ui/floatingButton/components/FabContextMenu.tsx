import {
  Eject,
  PictureInPicture,
  Refresh,
  SkipNext,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material'
import type { PopperProps } from '@mui/material'
import { MenuList, Paper, Popper } from '@mui/material'
import { useTranslation } from 'react-i18next'

import { useHotkeyOptions } from '@/common/options/extensionOptions/useHotkeyOptions'
import { playerRpcClient } from '@/common/rpcClient/background/client'
import { useLoadDanmaku } from '@/content/controller/common/hooks/useLoadDanmaku'
import {
  useShowDanmaku,
  useUnmountDanmaku,
} from '@/content/controller/common/hooks/useMountDanmaku'
import { useStore } from '@/content/controller/store/store'
import type { ContextMenuItemProps } from '@/content/controller/ui/floatingButton/components/ContextMenuItem'
import { ContextMenuItem } from '@/content/controller/ui/floatingButton/components/ContextMenuItem'
import { ContextMenuShortcut } from '@/content/controller/ui/floatingButton/components/ContextMenuShortcut'
import { useLoadDanmakuNextEpisode } from '@/content/controller/ui/floatingButton/hooks/useLoadDanmakuNextEpisode'

type FabContextMenuProps = PopperProps

const usePip = () => {
  const { activeFrame } = useStore.use.frame()

  const enterPip = () => {
    if (activeFrame === undefined) return
    playerRpcClient.player.enterPiP({ frameId: activeFrame.frameId })
  }

  return {
    enterPip,
  }
}

export const FabContextMenu = (props: FabContextMenuProps) => {
  const { t } = useTranslation()
  const hasComments = useStore.use.hasComments()
  const manual = useStore.use.manual()
  const visible = useStore.use.visible()
  const { enterPip } = usePip()
  const hasVideo = useStore((state) => state.hasVideo)
  const unmountMutation = useUnmountDanmaku()
  const showDanmakuMutation = useShowDanmaku()

  const {
    fetchNextEpisodeComments,
    isFetchingNextEpisode,
    canFetchNextEpisode,
  } = useLoadDanmakuNextEpisode()

  const { refreshComments, loadMutation, canRefresh } = useLoadDanmaku()

  const { getKeyCombo } = useHotkeyOptions()

  const isLoading = isFetchingNextEpisode || loadMutation.isPending

  const menuItems: ContextMenuItemProps[] = [
    {
      action: () => fetchNextEpisodeComments(),
      disabled: () => !canFetchNextEpisode || isLoading,
      tooltip: () => (manual ? '' : t('danmaku.tooltip.nextEpisode')),
      icon: () => <SkipNext fontSize="small" />,
      label: () => t('danmaku.nextEpisode'),
      hotkey: getKeyCombo('loadNextEpisodeComments'),
    },
    {
      action: () => refreshComments(),
      disabled: () => !canRefresh || isLoading,
      icon: () => <Refresh fontSize="small" />,
      label: () => t('danmaku.refresh'),
      hotkey: getKeyCombo('refreshComments'),
    },
    {
      action: () => unmountMutation.mutate(),
      disabled: () => !hasComments,
      icon: () => <Eject fontSize="small" />,
      label: () => t('danmaku.unmount'),
      hotkey: getKeyCombo('unmountComments'),
    },
    {
      action: () => showDanmakuMutation.mutate(),
      icon: () =>
        visible ? (
          <VisibilityOff fontSize="small" />
        ) : (
          <Visibility fontSize="small" />
        ),
      label: () => (visible ? t('danmaku.disable') : t('danmaku.enable')),
      hotkey: getKeyCombo('toggleEnableDanmaku'),
    },
    {
      action: () => enterPip(),
      disabled: () => !hasVideo,
      icon: () => <PictureInPicture fontSize="small" />,
      label: () => t('common.pip'),
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
