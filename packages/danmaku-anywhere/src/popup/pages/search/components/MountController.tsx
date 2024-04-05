import { LoadingButton } from '@mui/lab'
import { Box, Button, Skeleton, Stack } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { Suspense, useEffect, useState } from 'react'

import { DanmakuSelector } from './DanmakuSelector'

import type { DanmakuCacheLite } from '@/common/db/db'
import { useSessionState } from '@/common/hooks/extStorage/useSessionState'
import { tabRpcClient } from '@/common/rpc/client'
import { Logger } from '@/common/services/Logger'
import { useDanmakuQuery } from '@/popup/hooks/useDanmakuQuery'

export const MountController = () => {
  const [danmakuCache, setDanmakuCache] =
    useSessionState<DanmakuCacheLite | null>(null, 'controller/danmakuMeta')
  const [canUnmount, setCanUnmount] = useState<boolean>(false)

  const danmakuQuery = useDanmakuQuery(danmakuCache?.meta.episodeId)

  const tabDanmakuState = useQuery({
    queryKey: ['tab', 'danmaku', 'getCurrent'],
    queryFn: () => tabRpcClient.danmakuGetState(),
    retry: false,
  })

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
        return
      }

      const cache = await danmakuQuery.refetch()

      if (cache.data) {
        await tabRpcClient.danmakuMount({
          meta: cache.data.meta,
          comments: cache.data.comments,
        })
      }

      setCanUnmount(true)
    } catch (e) {
      Logger.error(e)
    }
  }

  const handleUnmount = async () => {
    try {
      await tabRpcClient.danmakuUnmount()
      setCanUnmount(false)
    } catch (e) {
      Logger.error(e)
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
        <Suspense fallback={<Skeleton height={56} width="100%" />}>
          <DanmakuSelector
            value={danmakuCache ?? null}
            onChange={setDanmakuCache}
          />
        </Suspense>
        <LoadingButton
          type="submit"
          variant="outlined"
          size="small"
          loading={danmakuCache !== null && danmakuQuery.isPending}
          disabled={danmakuCache === null}
        >
          Mount
        </LoadingButton>
        <Button
          variant="outlined"
          type="button"
          size="small"
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
