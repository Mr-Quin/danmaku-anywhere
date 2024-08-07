import { Suspense } from 'react'
import { useTranslation } from 'react-i18next'

import {
  BaseEpisodeListItem,
  BaseListItemSkeleton,
} from '@/common/components/AnimeList/BaseEpisodeListItem'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import type { DDPDanmakuMeta } from '@/common/danmaku/models/danmakuMeta'
import type { TitleMapping } from '@/common/danmaku/models/titleMapping'
import { useDanmakuQuerySuspense } from '@/common/danmaku/queries/useDanmakuQuerySuspense'
import { useFetchDanmakuMapped } from '@/content/common/hooks/useFetchDanmakuMapped'

type EpisodeListItemProps = Omit<Required<DDPDanmakuMeta>, 'type'> & {
  titleMapping?: TitleMapping
}

const InnerEpisodeListItem = ({
  titleMapping,
  ...rest
}: EpisodeListItemProps) => {
  const { t } = useTranslation()
  const { episodeId, episodeTitle } = rest
  const { fetch, isPending } = useFetchDanmakuMapped()

  const { data: danmakuData } = useDanmakuQuerySuspense({
    type: DanmakuSourceType.DDP,
    id: episodeId,
  })

  const hasDanmaku = !!danmakuData

  const handleFetchDanmaku = async () => {
    await fetch({
      danmakuMeta: { ...rest, type: DanmakuSourceType.DDP },
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
          ? `${new Date(danmakuData.timeUpdated).toLocaleDateString()} - ${t(
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
