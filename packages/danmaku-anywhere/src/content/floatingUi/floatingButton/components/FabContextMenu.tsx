import {
  Eject,
  Refresh,
  SkipNext,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material'
import type { PopperProps } from '@mui/material'
import {
  ListItemIcon,
  Tooltip,
  Popper,
  Paper,
  MenuList,
  MenuItem,
  ListItemText,
} from '@mui/material'
import { useTranslation } from 'react-i18next'

import { useToast } from '@/common/components/Toast/toastStore'
import { useLoadDanmakuNextEpisode } from '@/content/common/hooks/useLoadDanmakuNextEpisode'
import { useRefreshComments } from '@/content/common/hooks/useRefreshComments'
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

  const isLoading = isFetchingNextEpisode || isRefreshing

  return (
    <Paper>
      <Popper placement="top-end" {...props}>
        <Paper>
          <MenuList dense>
            <Tooltip
              title={manual ? '' : t('danmaku.tooltip.nextEpisode')}
              placement="top"
            >
              <div>
                <MenuItem
                  disabled={!canFetchNextEpisode || isLoading}
                  onClick={fetchNextEpisodeComments}
                >
                  <ListItemIcon>
                    <SkipNext fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>{t('danmaku.nextEpisode')}</ListItemText>
                </MenuItem>
              </div>
            </Tooltip>
            <MenuItem
              disabled={!canRefresh || isLoading}
              onClick={refreshComments}
            >
              <ListItemIcon>
                <Refresh fontSize="small" />
              </ListItemIcon>
              <ListItemText>{t('danmaku.refresh')}</ListItemText>
            </MenuItem>
            <MenuItem disabled={!hasComments} onClick={handleUnmount}>
              <ListItemIcon>
                <Eject fontSize="small" />
              </ListItemIcon>
              <ListItemText>{t('danmaku.unmount')}</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => toggleEnabled()}>
              <ListItemIcon>
                {enabled ? (
                  <VisibilityOff fontSize="small" />
                ) : (
                  <Visibility fontSize="small" />
                )}
              </ListItemIcon>
              <ListItemText>
                {enabled ? t('danmaku.disable') : t('danmaku.enable')}
              </ListItemText>
            </MenuItem>
          </MenuList>
        </Paper>
      </Popper>
    </Paper>
  )
}
