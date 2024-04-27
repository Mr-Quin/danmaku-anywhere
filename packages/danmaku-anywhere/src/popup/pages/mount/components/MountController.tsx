import { LoadingButton } from '@mui/lab'
import { Box, Button, Skeleton, Stack, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { Suspense, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useMountDanmakuPopup } from '../../../hooks/useMountDanmakuPopup'

import { DanmakuSelector } from '@/common/components/DanmakuSelector'
import { useToast } from '@/common/components/toast/toastStore'
import { useSessionState } from '@/common/queries/extStorage/useSessionState'
import { tabRpcClient } from '@/common/rpc/client'
import { Logger } from '@/common/services/Logger'
import type { DanmakuMeta } from '@/common/types/danmaku/Danmaku'

export const MountController = () => {
  const { t } = useTranslation()
  const [danmakuMeta, setDanmakuMeta] = useSessionState<DanmakuMeta | null>(
    null,
    'controller/danmakuMeta'
  )

  const tabDanmakuState = useQuery({
    queryKey: ['tab', 'danmaku', 'getCurrent'],
    queryFn: () => tabRpcClient.danmakuGetState(),
    retry: false,
  })

  const toast = useToast.use.toast()

  const [canUnmount, setCanUnmount] = useState<boolean>(false)

  const canMount = danmakuMeta !== null

  const { mutateAsync: mount, isPending: isMounting } = useMountDanmakuPopup()

  useEffect(() => {
    if (tabDanmakuState.data?.meta) {
      setDanmakuMeta(tabDanmakuState.data.meta)
      setCanUnmount(tabDanmakuState.data.manual)
    }
  }, [tabDanmakuState.data])

  const handleMount = async () => {
    if (!danmakuMeta) return
    await mount(danmakuMeta)
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
        handleMount()
      }}
    >
      <Stack direction="column" spacing={2}>
        <Typography>{t('mountPage.instructions')}</Typography>
        <Suspense fallback={<Skeleton height={56} width="100%" />}>
          <DanmakuSelector
            value={danmakuMeta ?? null}
            onChange={setDanmakuMeta}
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
