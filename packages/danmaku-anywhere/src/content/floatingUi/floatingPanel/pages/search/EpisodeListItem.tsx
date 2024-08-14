import { Suspense } from 'react'
import { useTranslation } from 'react-i18next'

import { BaseEpisodeListItem } from '@/common/components/MediaList/components/BaseEpisodeListItem'
import { ListItemSkeleton } from '@/common/components/MediaList/components/ListItemSkeleton'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import type { DanDanPlayMeta } from '@/common/danmaku/models/meta'
import type { TitleMapping } from '@/common/danmaku/models/titleMapping'
import { useDanmakuQuerySuspense } from '@/common/danmaku/queries/useDanmakuQuerySuspense'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { useFetchDanmakuMapped } from '@/content/common/hooks/useFetchDanmakuMapped'

type EpisodeListItemProps = Omit<Required<DanDanPlayMeta>, 'provider'> & {
  titleMapping?: TitleMapping
}

const InnerEpisodeListItem = ({
  titleMapping,
  ...rest
}: EpisodeListItemProps) => {
  const { t } = useTranslation()
  const { episodeId, episodeTitle } = rest
  const { fetch } = useFetchDanmakuMapped()

  const handleFetchDanmaku = async () => {
    await fetch({
      danmakuMeta: { ...rest, provider: DanmakuSourceType.DDP },
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
      mutateDanmaku={handleFetchDanmaku}
      queryKey={useDanmakuQuerySuspense.queryKey({
        provider: DanmakuSourceType.DDP,
        episodeId: episodeId,
      })}
      queryDanmaku={async () => {
        return await chromeRpcClient.danmakuGetOne({
          provider: DanmakuSourceType.DDP,
          episodeId: episodeId,
        })
      }}
      secondaryText={(data) =>
        `${new Date(data.timeUpdated).toLocaleDateString()} -  ${t(
          'danmaku.commentCounted',
          {
            count: data.commentCount,
          }
        )}`
      }
    />
  )
}

export const EpisodeListItem = (props: EpisodeListItemProps) => {
  return (
    <Suspense fallback={<ListItemSkeleton />}>
      <InnerEpisodeListItem {...props} />
    </Suspense>
  )
}
