import { LoadingButton } from '@mui/lab'
import { Box, Button, Skeleton, Stack, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { Suspense, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { DanmakuSelector } from '@/common/components/DanmakuSelector/DanmakuSelector'
import { useToast } from '@/common/components/Toast/toastStore'
import type { DanmakuLite } from '@/common/danmaku/models/danmaku'
import { Logger } from '@/common/Logger'
import { tabRpcClient } from '@/common/rpcClient/tab/client'
import { useSessionState } from '@/common/storage/hooks/useSessionState'
import { useMountDanmakuPopup } from '@/popup/hooks/useMountDanmakuPopup'

export const MountController = () => {
  const { t } = useTranslation()
  const [danmakuLite, setDanmakuLite] = useSessionState<DanmakuLite | null>(
    null,
    'controller/danmakuMeta'
  )

  const tabDanmakuState = useQuery({
    queryKey: [
      {
        scope: 'tab',
        kind: 'danmakuState',
      },
    ],
    queryFn: () => tabRpcClient.danmakuGetState(),
    select: (res) => res.data,
    retry: false,
  })

  const toast = useToast.use.toast()

  const [canUnmount, setCanUnmount] = useState<boolean>(false)

  const canMount = danmakuLite !== null

  const { mutateAsync: mount, isPending: isMounting } = useMountDanmakuPopup()

  useEffect(() => {
    if (tabDanmakuState.data?.danmaku) {
      setDanmakuLite(tabDanmakuState.data.danmaku)
      setCanUnmount(tabDanmakuState.data.manual)
    }
  }, [tabDanmakuState.data])

  const handleMount = async () => {
    if (!danmakuLite) return
    await mount({ id: danmakuLite.id })
    setCanUnmount(true)
  }

  const handleUnmount = async () => {
    try {
      await tabRpcClient.danmakuUnmount()
      setCanUnmount(false)
    } catch (e) {
      toast.error(`${(e as Error).message}`)
      Logger.debug(e)
    }
  }

  return (
    <Box
      component="form"
      onSubmit={(e) => {
        e.preventDefault()
        void handleMount()
      }}
    >
      <Stack direction="column" spacing={2}>
        <Typography>{t('mountPage.instructions')}</Typography>
        <Suspense fallback={<Skeleton height={56} width="100%" />}>
          <DanmakuSelector
            value={danmakuLite ?? null}
            onChange={setDanmakuLite}
            height={350}
          />
        </Suspense>
        <LoadingButton
          type="submit"
          variant="contained"
          loading={isMounting}
          disabled={!canMount}
        >
          {t('danmaku.mount')}
        </LoadingButton>
        <Button
          variant="outlined"
          type="button"
          onClick={handleUnmount}
          color="warning"
          disabled={!canUnmount}
        >
          {t('danmaku.unmount')}
        </Button>
      </Stack>
    </Box>
  )
}
