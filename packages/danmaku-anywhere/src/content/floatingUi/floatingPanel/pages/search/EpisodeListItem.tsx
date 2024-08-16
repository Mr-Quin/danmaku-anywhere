import { Suspense } from 'react'
import { useTranslation } from 'react-i18next'

import { BaseEpisodeListItem } from '@/common/components/MediaList/components/BaseEpisodeListItem'
import { ListItemSkeleton } from '@/common/components/MediaList/components/ListItemSkeleton'
import type { DanmakuFetchContext } from '@/common/danmaku/dto'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import type { DanDanPlayMeta } from '@/common/danmaku/models/meta'
import { danmakuKeys } from '@/common/danmaku/queries/danmakuQueryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { useLoadDanmaku } from '@/content/common/hooks/useLoadDanmaku'

type EpisodeListItemProps = Omit<Required<DanDanPlayMeta>, 'provider'> & {
  context?: DanmakuFetchContext
}

const InnerEpisodeListItem = ({ context, ...rest }: EpisodeListItemProps) => {
  const { t } = useTranslation()
  const { episodeId, episodeTitle } = rest
  const { mutate } = useLoadDanmaku()

  const handleFetchDanmaku = async () => {
    mutate({
      danmakuMeta: { ...rest, provider: DanmakuSourceType.DDP },
      context,
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
      queryKey={danmakuKeys.one({
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
