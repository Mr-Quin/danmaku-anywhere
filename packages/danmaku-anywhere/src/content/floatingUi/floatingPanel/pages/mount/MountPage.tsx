import { LoadingButton } from '@mui/lab'
import { Box, Button, Stack, Typography } from '@mui/material'

import { DanmakuSelector } from '@/common/components/DanmakuSelector'
import { useToast } from '@/common/components/toast/toastStore'
import { ManualMode } from '@/content/common/components/ManualMode'
import { useMountDanmakuContent } from '@/content/common/hooks/useMountDanmakuContent'
import { useStore } from '@/content/store/store'

export const MountPage = () => {
  const toast = useToast.use.toast()

  const manual = useStore((state) => state.manual)
  const integration = useStore((state) => state.integration)
  const danmakuMeta = useStore((state) => state.danmakuMeta)
  const setDanmakuMeta = useStore((state) => state.setDanmakuMeta)
  const unmountManual = useStore((state) => state.unmountManual)

  const { mutateAsync, isPending } = useMountDanmakuContent()

  const handleMount = async () => {
    if (!danmakuMeta) return
    await mutateAsync(danmakuMeta)
  }

  const handleUnmount = () => {
    toast.info('Danmaku unmounted')
    unmountManual()
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
            value={danmakuMeta ?? null} // convert between undefined and null
            onChange={(meta) => setDanmakuMeta(meta ?? undefined)}
          />
          <LoadingButton
            type="submit"
            variant="contained"
            loading={isPending}
            disabled={!danmakuMeta}
            onClick={handleMount}
          >
            Mount
          </LoadingButton>
          <Button
            variant="outlined"
            type="button"
            onClick={handleUnmount}
            color="warning"
            disabled={!manual || !danmakuMeta}
          >
            Unmount
          </Button>
        </Stack>
      </ManualMode>
    </Box>
  )
}
