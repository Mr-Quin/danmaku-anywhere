import { Button, Collapse, Toolbar, Tooltip, Typography } from '@mui/material'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { episodeToString } from '@/common/danmaku/utils'
import { useUnmountDanmaku } from '@/content/controller/common/hooks/useUnmountDanmaku'
import { useStore } from '@/content/controller/store/store'

export const InfoBar = () => {
  const { t } = useTranslation()

  const { isMounted, episodes } = useStore.use.danmaku()

  const unmountMutation = useUnmountDanmaku()
  const handleUnmount = () => {
    unmountMutation.mutate()
  }

  const { titles, title } = useMemo(() => {
    if (!episodes || episodes.length === 0) {
      return {
        title: '',
        titles: [],
      }
    }
    return {
      title: episodeToString(episodes[0]),
      titles: episodes.map((e) => {
        return <div key={e.id}>{episodeToString(e)}</div>
      }),
    }
  }, [episodes])

  return (
    <Collapse in={isMounted}>
      <Toolbar
        variant="dense"
        sx={{
          pl: { sm: 2 },
          pr: { xs: 1, sm: 1 },
          backgroundColor: 'background.paper',
          gap: 1,
          justifyContent: 'space-between',
        }}
      >
        {episodes && episodes.length > 0 && (
          <Tooltip title={titles}>
            <Typography noWrap>{title}</Typography>
          </Tooltip>
        )}
        <Button
          variant="outlined"
          type="button"
          onClick={handleUnmount}
          color="warning"
          disabled={!episodes || !isMounted}
          sx={{ flexShrink: 0 }}
        >
          {t('danmaku.unmount')}
        </Button>
      </Toolbar>
    </Collapse>
  )
}
