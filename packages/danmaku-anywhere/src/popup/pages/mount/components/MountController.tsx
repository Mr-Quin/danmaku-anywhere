import { LoadingButton } from '@mui/lab'
import { Box, Button, Skeleton, Stack, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { Suspense, useEffect, useState } from 'react'

import { useMountDanmaku } from '../../../hooks/useMountDanmaku'

import { DanmakuSelector } from './DanmakuSelector'

import { useToast } from '@/common/components/toast/toastStore'
import type { DanmakuCacheLite } from '@/common/db/db'
import { useSessionState } from '@/common/queries/extStorage/useSessionState'
import { tabRpcClient } from '@/common/rpc/client'
import { Logger } from '@/common/services/Logger'

export const MountController = () => {
  const [danmakuCache, setDanmakuCache] =
    useSessionState<DanmakuCacheLite | null>(null, 'controller/danmakuMeta')

  const tabDanmakuState = useQuery({
    queryKey: ['tab', 'danmaku', 'getCurrent'],
    queryFn: () => tabRpcClient.danmakuGetState(),
    retry: false,
  })

  const toast = useToast.use.toast()

  const [canUnmount, setCanUnmount] = useState<boolean>(false)

  const canMount = danmakuCache !== null

  const { mutateAsync: mount, isPending: isMounting } = useMountDanmaku()

  useEffect(() => {
    if (tabDanmakuState.data?.meta) {
      setDanmakuCache({
        meta: tabDanmakuState.data.meta,
        count: tabDanmakuState.data.count,
      })
      setCanUnmount(tabDanmakuState.data.manual)
    }
  }, [tabDanmakuState.data])

  const handleMount = async () => {
    if (!danmakuCache) return
    await mount(danmakuCache.meta)
    setCanUnmount(true)
  }

  const handleUnmount = async () => {
    try {
      await tabRpcClient.danmakuUnmount()
      setCanUnmount(false)
    } catch (e) {
      toast.error(`Failed to unmount danmaku: ${(e as Error).message}`)
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
        <Typography>
          Select an episode and click Mount to inject it into the current tab.
        </Typography>
        <Suspense fallback={<Skeleton height={56} width="100%" />}>
          <DanmakuSelector
            value={danmakuCache ?? null}
            onChange={setDanmakuCache}
          />
        </Suspense>
        <LoadingButton
          type="submit"
          variant="contained"
          loading={isMounting}
          disabled={!canMount}
        >
          Mount
        </LoadingButton>
        <Button
          variant="outlined"
          type="button"
          onClick={handleUnmount}
          color="warning"
          disabled={!canUnmount}
        >
          Unmount
        </Button>
      </Stack>
    </Box>
  )
}
