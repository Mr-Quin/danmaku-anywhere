import { LoadingButton } from '@mui/lab'
import { Box, Button, Stack } from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { DanmakuSelector } from '@/common/components/DanmakuSelector/DanmakuSelector'
import type { DanmakuLite } from '@/common/danmaku/models/danmaku'
import { useUnmountDanmaku } from '@/content/controller/common/hooks/useMountDanmaku'
import { useStore } from '@/content/controller/store/store'
import { useMountDanmakuContent } from '@/content/controller/ui/floatingPanel/pages/mount/useMountDanmakuContent'

export const MountPage = () => {
  const { t } = useTranslation()

  const danmakuLite = useStore((state) => state.danmakuLite)
  const hasComments = useStore((state) => state.hasComments)

  const [localDanmakuLite, setLocalDanmakuLite] = useState<
    DanmakuLite | undefined
  >(danmakuLite)

  const { mutateAsync, isPending } = useMountDanmakuContent()
  const unmountMutation = useUnmountDanmaku()

  const handleSelectDanmaku = (danmakuLite?: DanmakuLite) => {
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
        <LoadingButton
          type="submit"
          variant="contained"
          loading={isPending}
          disabled={!localDanmakuLite}
          onClick={handleMount}
        >
          {t('danmaku.mount')}
        </LoadingButton>
        <Button
          variant="outlined"
          type="button"
          onClick={handleUnmount}
          color="warning"
          disabled={!localDanmakuLite || !hasComments}
        >
          {t('danmaku.unmount')}
        </Button>
      </Stack>
    </Box>
  )
}
