import { LoadingButton } from '@mui/lab'
import { Box, Button, Stack, Typography } from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { DanmakuSelector } from '@/common/components/DanmakuSelector/DanmakuSelector'
import { useToast } from '@/common/components/Toast/toastStore'
import { getIntegrationLabel } from '@/common/danmaku/enums'
import type { DanmakuMeta } from '@/common/danmaku/models/danmakuMeta'
import { ManualMode } from '@/content/common/components/ManualMode'
import { useMountDanmakuContent } from '@/content/common/hooks/useMountDanmakuContent'
import { useStore } from '@/content/store/store'

export const MountPage = () => {
  const { t } = useTranslation()
  const toast = useToast.use.toast()

  const manual = useStore((state) => state.manual)
  const integration = useStore((state) => state.integration)
  const danmakuMeta = useStore((state) => state.danmakuMeta)
  const hasComments = useStore((state) => state.hasComments)
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
    toast.info(t('danmaku.alert.unmounted'))
    resetMediaState()
  }

  return (
    <Box p={2} flexGrow={1}>
      <ManualMode
        fallback={
          <Stack direction="column" spacing={2}>
            <Typography>
              {t('mountPage.manualModeOnly', {
                integration: getIntegrationLabel(integration),
              })}
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
            {t('danmaku.mount')}
          </LoadingButton>
          <Button
            variant="outlined"
            type="button"
            onClick={handleUnmount}
            color="warning"
            disabled={!manual || !localDanmakuMeta || !hasComments}
          >
            {t('danmaku.unmount')}
          </Button>
        </Stack>
      </ManualMode>
    </Box>
  )
}
