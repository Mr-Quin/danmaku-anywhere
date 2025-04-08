import { Box, Button, Stack } from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { DanmakuSelector } from '@/common/components/DanmakuSelector/DanmakuSelector'
import { EpisodeLiteV4, WithSeason } from '@/common/danmaku/types/v4/schema'
import { useUnmountDanmaku } from '@/content/controller/common/hooks/useUnmountDanmaku'
import { useStore } from '@/content/controller/store/store'
import { useMountDanmakuContent } from '@/content/controller/ui/floatingPanel/pages/mount/useMountDanmakuContent'

export const MountPage = () => {
  const { t } = useTranslation()

  const { isMounted, danmakuLite } = useStore.use.danmaku()

  const [localDanmakuLite, setLocalDanmakuLite] = useState<
    WithSeason<EpisodeLiteV4> | undefined
  >(danmakuLite)

  const { mutateAsync, isPending } = useMountDanmakuContent()
  const unmountMutation = useUnmountDanmaku()

  const handleSelectDanmaku = (danmakuLite?: WithSeason<EpisodeLiteV4>) => {
    setLocalDanmakuLite(danmakuLite)
  }

  const handleMount = async () => {
    if (!localDanmakuLite) return
    await mutateAsync(localDanmakuLite)
  }

  const handleUnmount = () => {
    unmountMutation.mutate()
  }

  return (
    <Box p={2} flexGrow={1}>
      <Stack direction="column" spacing={2} height={1}>
        <DanmakuSelector
          value={localDanmakuLite ?? null} // convert between undefined and null
          onChange={(danmakuLite) =>
            handleSelectDanmaku(danmakuLite ?? undefined)
          }
          height={350}
        />
        <Button
          type="submit"
          variant="contained"
          loading={isPending}
          disabled={!localDanmakuLite}
          onClick={handleMount}
        >
          {t('danmaku.mount')}
        </Button>
        <Button
          variant="outlined"
          type="button"
          onClick={handleUnmount}
          color="warning"
          disabled={!localDanmakuLite || !isMounted}
        >
          {t('danmaku.unmount')}
        </Button>
      </Stack>
    </Box>
  )
}
