import { Suspense } from 'react'
import { useTranslation } from 'react-i18next'

import { BaseEpisodeListItem } from '@/common/components/MediaList/components/BaseEpisodeListItem'
import { ListItemSkeleton } from '@/common/components/MediaList/components/ListItemSkeleton'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import type { BiliBiliMeta } from '@/common/danmaku/models/danmakuMeta'
import { useDanmakuQuerySuspense } from '@/common/danmaku/queries/useDanmakuQuerySuspense'
import { useFetchDanmaku } from '@/common/danmaku/queries/useFetchDanmaku'

interface EpisodeListItemProps {
  tooltip: string
  // meta: Omit<Required<BiliBiliMeta>, 'type'>
  title: string
}

const InnerEpisodeListItem = (props: EpisodeListItemProps) => {
  const { t } = useTranslation()
  const { title, tooltip } = props
  const { fetch, isPending } = useFetchDanmaku()

  return (
    <BaseEpisodeListItem
      showIcon
      episodeTitle={title}
      tooltip={tooltip}
      queryKey={[]}
      fetchDanmaku={async () => null}
    />
  )
}

export const BilibiliEpisode = (props: EpisodeListItemProps) => {
  return (
    <Suspense fallback={<ListItemSkeleton />}>
      <InnerEpisodeListItem {...props} />
    </Suspense>
  )
}
