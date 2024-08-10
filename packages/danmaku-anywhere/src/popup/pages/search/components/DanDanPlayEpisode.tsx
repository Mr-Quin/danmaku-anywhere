import { Suspense } from 'react'
import { useTranslation } from 'react-i18next'

import { BaseEpisodeListItem } from '@/common/components/MediaList/components/BaseEpisodeListItem'
import { ListItemSkeleton } from '@/common/components/MediaList/components/ListItemSkeleton'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import type { DanDanPlayMeta } from '@/common/danmaku/models/danmakuMeta'
import { useDanmakuQuerySuspense } from '@/common/danmaku/queries/useDanmakuQuerySuspense'
import { useFetchDanmaku } from '@/common/danmaku/queries/useFetchDanmaku'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

type EpisodeListItemProps = Omit<Required<DanDanPlayMeta>, 'type'>

const InnerEpisodeListItem = (props: EpisodeListItemProps) => {
  const { t } = useTranslation()
  const { episodeId, episodeTitle } = props
  const { fetch, isPending } = useFetchDanmaku()

  const handleFetchDanmaku = async () => {
    await fetch({
      meta: { ...props, type: DanmakuSourceType.DDP },
      options: {
        forceUpdate: true,
      },
    })
  }

  return (
    <BaseEpisodeListItem
      showIcon
      episodeTitle={episodeTitle}
      isUpdating={isPending}
      queryKey={useDanmakuQuerySuspense.queryKey({
        type: DanmakuSourceType.DDP,
        id: episodeId,
      })}
      fetchDanmaku={async () => {
        return await chromeRpcClient.danmakuGetOne({
          type: DanmakuSourceType.DDP,
          id: episodeId,
        })
      }}
      onClick={handleFetchDanmaku}
      secondaryText={(data) =>
        `${new Date(data.timeUpdated).toLocaleDateString()} -  ${t(
          'danmaku.commentCounted',
          {
            count: data.count,
          }
        )}`
      }
    />
  )
}

export const DanDanPlayEpisode = (props: EpisodeListItemProps) => {
  return (
    <Suspense fallback={<ListItemSkeleton />}>
      <InnerEpisodeListItem {...props} />
    </Suspense>
  )
}
