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
import { useHotkeys } from 'react-hotkeys-hook'
import { useTranslation } from 'react-i18next'

import { useToast } from '@/common/components/Toast/toastStore'
import { useHotkeyOptions } from '@/common/options/extensionOptions/useHotkeyOptions'
import { useLoadDanmakuNextEpisode } from '@/content/common/hooks/useLoadDanmakuNextEpisode'
import { useRefreshComments } from '@/content/common/hooks/useRefreshComments'
import type { ContextMenuItemProps } from '@/content/floatingUi/floatingButton/components/ContextMenuItem'
import { ContextMenuItem } from '@/content/floatingUi/floatingButton/components/ContextMenuItem'
import { useStore } from '@/content/store/store'

type FabContextMenuProps = PopperProps

export const FabContextMenu = (props: FabContextMenuProps) => {
  const { t } = useTranslation()
  const toast = useToast.use.toast()
  const resetMediaState = useStore.use.resetMediaState()
  const hasComments = useStore.use.hasComments()
  const manual = useStore.use.manual()
  const toggleEnabled = useStore.use.toggleEnabled()
  const enabled = useStore.use.enabled()
  const enterPip = useStore((state) => state.enterPip)
  const hasVideo = useStore((state) => state.hasVideo)

  const {
    fetchNextEpisodeComments,
    isFetchingNextEpisode,
    canFetchNextEpisode,
  } = useLoadDanmakuNextEpisode()

  const {
    refreshComments,
    isPending: isRefreshing,
    canRefresh,
  } = useRefreshComments()

  const handleUnmount = () => {
    toast.info(t('danmaku.alert.unmounted'))
    resetMediaState()
  }

  const { getKeyCombo } = useHotkeyOptions()

  const isLoading = isFetchingNextEpisode || isRefreshing

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
      action: () => handleUnmount(),
      disabled: () => !hasComments,
      icon: () => <Eject fontSize="small" />,
      label: () => t('danmaku.unmount'),
      hotkey: getKeyCombo('unmountComments'),
    },
    {
      action: () => toggleEnabled(),
      icon: () =>
        enabled ? (
          <VisibilityOff fontSize="small" />
        ) : (
          <Visibility fontSize="small" />
        ),
      label: () => (enabled ? t('danmaku.disable') : t('danmaku.enable')),
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

  // register global hotkeys
  menuItems.forEach((item) => {
    useHotkeys(item.hotkey ?? '', item.action, {
      enabled: !!item.hotkey && !item.disabled?.(),
    })
  })

  return (
    <Paper>
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
