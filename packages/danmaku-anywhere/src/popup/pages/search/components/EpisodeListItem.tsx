import { Suspense } from 'react'
import { useTranslation } from 'react-i18next'

import {
  BaseListItemSkeleton,
  BaseEpisodeListItem,
} from '@/common/components/animeList/BaseEpisodeListItem'
import { useDanmakuQuerySuspense } from '@/common/queries/danmaku/useDanmakuQuerySuspense'
import { useFetchDanmaku } from '@/common/queries/danmaku/useFetchDanmaku'
import type { DDPDanmakuMeta } from '@/common/types/danmaku/Danmaku'
import { DanmakuType } from '@/common/types/danmaku/Danmaku'

type EpisodeListItemProps = Omit<Required<DDPDanmakuMeta>, 'type'>

const InnerEpisodeListItem = (props: EpisodeListItemProps) => {
  const { t } = useTranslation()
  const { episodeId, episodeTitle } = props
  const { fetch, isPending } = useFetchDanmaku()

  const { data: danmakuData } = useDanmakuQuerySuspense({
    type: DanmakuType.DDP,
    id: episodeId,
  })

  const hasDanmaku = !!danmakuData

  const handleFetchDanmaku = async () => {
    await fetch({
      meta: { ...props, type: DanmakuType.DDP },
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
