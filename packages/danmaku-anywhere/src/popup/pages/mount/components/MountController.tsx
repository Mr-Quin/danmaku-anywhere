import { LoadingButton } from '@mui/lab'
import { Box, Button, Skeleton, Stack, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { Suspense, useEffect, useState } from 'react'

import { DanmakuSelector } from './DanmakuSelector'

import { useToast } from '@/common/components/toast/toastStore'
import type { DanmakuCacheLite } from '@/common/db/db'
import { useDanmakuQuery } from '@/common/queries/danmaku/useDanmakuQuery'
import { useSessionState } from '@/common/queries/extStorage/useSessionState'
import { tabRpcClient } from '@/common/rpc/client'
import { Logger } from '@/common/services/Logger'

export const MountController = () => {
  const [danmakuCache, setDanmakuCache] =
    useSessionState<DanmakuCacheLite | null>(null, 'controller/danmakuMeta')

  const danmakuQuery = useDanmakuQuery(danmakuCache?.meta.episodeId)

  const tabDanmakuState = useQuery({
    queryKey: ['tab', 'danmaku', 'getCurrent'],
    queryFn: () => tabRpcClient.danmakuGetState(),
    retry: false,
  })

  const toast = useToast.use.toast()

  const [canUnmount, setCanUnmount] = useState<boolean>(false)

  const canMount = danmakuCache !== null

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
    try {
      if (danmakuQuery.data) {
        await tabRpcClient.danmakuMount({
          meta: danmakuQuery.data.meta,
          comments: danmakuQuery.data.comments,
        })
        setCanUnmount(true)
        toast.success('Danmaku mounted')
        return
      }

      const cache = await danmakuQuery.refetch()

      if (cache.data) {
        await tabRpcClient.danmakuMount({
          meta: cache.data.meta,
          comments: cache.data.comments,
        })
        setCanUnmount(true)
        toast.success('Danmaku mounted')
      }
    } catch (e) {
      toast.error(`Failed to mount danmaku: ${(e as Error).message}`)
      Logger.debug(e)
    }
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
          loading={danmakuCache !== null && danmakuQuery.isPending}
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
