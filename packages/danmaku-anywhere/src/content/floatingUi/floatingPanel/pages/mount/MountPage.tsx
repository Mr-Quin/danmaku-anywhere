import { LoadingButton } from '@mui/lab'
import { Box, Button, Stack, Typography } from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { DanmakuSelector } from '@/common/components/DanmakuSelector/DanmakuSelector'
import { useToast } from '@/common/components/Toast/toastStore'
import { getIntegrationLabel } from '@/common/danmaku/enums'
import type { DanmakuLite } from '@/common/danmaku/models/danmaku'
import { ManualMode } from '@/content/common/components/ManualMode'
import { useMountDanmakuContent } from '@/content/common/hooks/useMountDanmakuContent'
import { useStore } from '@/content/store/store'

export const MountPage = () => {
  const { t } = useTranslation()
  const toast = useToast.use.toast()

  const manual = useStore((state) => state.manual)
  const integration = useStore((state) => state.integration)
  const danmakuLite = useStore((state) => state.danmakuLite)
  const hasComments = useStore((state) => state.hasComments)
  const resetMediaState = useStore((state) => state.resetMediaState)

  const [localDanmakuLite, setLocalDanmakuLite] = useState<
    DanmakuLite | undefined
  >(danmakuLite)

  const { mutateAsync, isPending } = useMountDanmakuContent()

  const handleSelectDanmaku = (danmakuLite?: DanmakuLite) => {
    setLocalDanmakuLite(danmakuLite)
  }

  const handleMount = async () => {
    if (!localDanmakuLite) return
    await mutateAsync(localDanmakuLite)
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
            value={localDanmakuLite ?? null} // convert between undefined and null
            onChange={(danmakuLite) =>
              handleSelectDanmaku(danmakuLite ?? undefined)
            }
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
            disabled={!manual || !localDanmakuLite || !hasComments}
          >
            {t('danmaku.unmount')}
          </Button>
        </Stack>
      </ManualMode>
    </Box>
  )
}
