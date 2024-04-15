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
  const toggleManualMode = useStore((state) => state.toggleManualMode)
  const turnOffManualMode = useStore((state) => state.turnOffManualMode)

  const { mutateAsync, isPending } = useMountDanmakuContent()

  const handleMount = async () => {
    if (!danmakuMeta) return
    await mutateAsync(danmakuMeta)
  }

  const handleUnmount = () => {
    toast.info('Danmaku unmounted')
    turnOffManualMode()
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
              Entering manual mode will disable integration with {integration}.
            </Typography>
            <Button onClick={() => toggleManualMode(true)} variant="contained">
              Switch to manual mode
            </Button>
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
          {integration && (
            <Button
              onClick={() => toggleManualMode(false)}
              variant="contained"
              sx={{
                alignSelf: 'flex-end',
              }}
              style={{
                marginTop: 'auto', // for some reason auto in sx doesn't work
              }}
            >
              Turn off manual mode
            </Button>
          )}
        </Stack>
      </ManualMode>
    </Box>
  )
}
