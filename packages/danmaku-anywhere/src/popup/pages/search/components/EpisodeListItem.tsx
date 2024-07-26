import { Suspense } from 'react'
import { useTranslation } from 'react-i18next'

import {
  BaseEpisodeListItem,
  BaseListItemSkeleton,
} from '@/common/components/AnimeList/BaseEpisodeListItem'
import { useDanmakuQuerySuspense } from '@/common/danmaku/queries/useDanmakuQuerySuspense'
import { useFetchDanmaku } from '@/common/danmaku/queries/useFetchDanmaku'
import { DanmakuSourceType } from '@/common/danmaku/types/enums'
import type { DDPDanmakuMeta } from '@/common/danmaku/types/types'

type EpisodeListItemProps = Omit<Required<DDPDanmakuMeta>, 'type'>

const InnerEpisodeListItem = (props: EpisodeListItemProps) => {
  const { t } = useTranslation()
  const { episodeId, episodeTitle } = props
  const { fetch, isPending } = useFetchDanmaku()

  const { data: danmakuData } = useDanmakuQuerySuspense({
    type: DanmakuSourceType.DDP,
    id: episodeId,
  })

  const hasDanmaku = !!danmakuData

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
      isLoading={isPending}
      isFetched={hasDanmaku}
      onClick={handleFetchDanmaku}
      secondaryText={
        hasDanmaku
          ? `${new Date(danmakuData.timeUpdated).toLocaleDateString()} -  ${t(
              'danmaku.commentCounted',
              {
                count: danmakuData.count,
              }
            )}`
          : ''
      }
    />
  )
}

export const EpisodeListItem = (props: EpisodeListItemProps) => {
  return (
    <Suspense fallback={<BaseListItemSkeleton />}>
      <InnerEpisodeListItem {...props} />
    </Suspense>
  )
}
