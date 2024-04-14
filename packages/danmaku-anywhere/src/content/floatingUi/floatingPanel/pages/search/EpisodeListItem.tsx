import { Suspense } from 'react'

import {
  BaseListItemSkeleton,
  BaseEpisodeListItem,
} from '@/common/components/animeList/BaseEpisodeListItem'
import type { DanmakuMeta, TitleMapping } from '@/common/db/db'
import { useDanmakuQuerySuspense } from '@/common/hooks/useDanmakuQuerySuspense'
import { useFetchDanmakuMutation } from '@/content/common/hooks/useFetchDanmakuMutation'

type EpisodeListItemProps = Required<DanmakuMeta> & {
  titleMapping?: TitleMapping
}

const InnerEpisodeListItem = ({
  titleMapping,
  ...rest
}: EpisodeListItemProps) => {
  const { episodeId, episodeTitle } = rest
  const { fetch, isPending } = useFetchDanmakuMutation()

  const { data: danmakuData } = useDanmakuQuerySuspense(episodeId)

  const hasDanmaku = !!danmakuData

  const handleFetchDanmaku = async () => {
    await fetch({
      danmakuMeta: rest,
      titleMapping,
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
          ? `${new Date(danmakuData.timeUpdated).toLocaleDateString()} - ${
              danmakuData.count
            } comments`
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
