import { LoadingButton } from '@mui/lab'
import { Box, Button, Stack, Typography } from '@mui/material'
import { useState } from 'react'

import { DanmakuSelector } from '@/common/components/DanmakuSelector'
import { useToast } from '@/common/components/toast/toastStore'
import type { DanmakuMeta } from '@/common/db/db'
import { ManualMode } from '@/content/common/components/ManualMode'
import { useMountDanmakuContent } from '@/content/common/hooks/useMountDanmakuContent'
import { useStore } from '@/content/store/store'

export const MountPage = () => {
  const toast = useToast.use.toast()

  const manual = useStore((state) => state.manual)
  const integration = useStore((state) => state.integration)
  const danmakuMeta = useStore((state) => state.danmakuMeta)
  const comments = useStore((state) => state.comments)
  const resetMediaState = useStore((state) => state.resetMediaState)

  const [localDanmakuMeta, setLocalDanmakuMeta] = useState<
    DanmakuMeta | undefined
  >(danmakuMeta)

  const { mutateAsync, isPending } = useMountDanmakuContent()

  const handleSelectDanmaku = (meta?: DanmakuMeta) => {
    setLocalDanmakuMeta(meta)
  }

  const handleMount = async () => {
    if (!localDanmakuMeta) return
    await mutateAsync(localDanmakuMeta)
  }

  const handleUnmount = () => {
    toast.info('Danmaku unmounted')
    resetMediaState()
  }

  return (
    <Box p={2} flexGrow={1}>
      <ManualMode
        fallback={
          <Stack direction="column" spacing={2}>
            <Typography>
              The mount page is only available in manual mode.
            </Typography>
            <Typography>
              This page has integration with <strong>{integration}</strong>.
              Turn off auto mode first to use manual mounting.
            </Typography>
          </Stack>
        }
      >
        <Stack direction="column" spacing={2} height={1}>
          <DanmakuSelector
            value={localDanmakuMeta ?? null} // convert between undefined and null
            onChange={(meta) => handleSelectDanmaku(meta ?? undefined)}
          />
          <LoadingButton
            type="submit"
            variant="contained"
            loading={isPending}
            disabled={!localDanmakuMeta}
            onClick={handleMount}
          >
            Mount
          </LoadingButton>
          <Button
            variant="outlined"
            type="button"
            onClick={handleUnmount}
            color="warning"
            disabled={!manual || !localDanmakuMeta || !comments.length}
          >
            Unmount
          </Button>
        </Stack>
      </ManualMode>
    </Box>
  )
}
