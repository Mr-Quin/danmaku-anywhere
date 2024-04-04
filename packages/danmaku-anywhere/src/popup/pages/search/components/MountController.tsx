import { Box, Button, Skeleton, Stack } from '@mui/material'
import { Suspense } from 'react'

import { MountControllerAutoComplete } from './MountControllerAutoComplete'

import type { DanmakuCacheLite } from '@/common/db/db'
import { useSessionState } from '@/common/hooks/extStorage/useSessionState'
import { tabRpcClient } from '@/common/rpc/client'
import { useDanmakuQuery } from '@/popup/hooks/useDanmakuQuery'

export const MountController = () => {
  const [danmakuCache, setDanmakuCache] =
    useSessionState<DanmakuCacheLite | null>(null, 'controller/danmakuMeta')

  const danmakuQuery = useDanmakuQuery(danmakuCache?.meta.episodeId)

  const handleSetDanmaku = async () => {
    if (danmakuQuery.data) {
      tabRpcClient.danmakuMount(danmakuQuery.data.comments)
      return
    }

    const cache = await danmakuQuery.refetch()

    if (cache.data) {
      tabRpcClient.danmakuMount(cache.data.comments)
    }
  }

  return (
    <Box
      component="form"
      onSubmit={(e) => {
        e.preventDefault()
        handleSetDanmaku()
      }}
    >
      <Stack direction="column" spacing={2}>
        <Suspense fallback={<Skeleton height={56} width="100%" />}>
          <MountControllerAutoComplete
            value={danmakuCache ?? null}
            onChange={setDanmakuCache}
          />
        </Suspense>
        <Button
          type="submit"
          variant="outlined"
          size="small"
          disabled={danmakuCache === null}
        >
          Mount
        </Button>
        <Button
          variant="outlined"
          type="button"
          size="small"
          onClick={() => tabRpcClient.danmakuUnmount()}
          color="warning"
        >
          Unmount
        </Button>
      </Stack>
    </Box>
  )
}
