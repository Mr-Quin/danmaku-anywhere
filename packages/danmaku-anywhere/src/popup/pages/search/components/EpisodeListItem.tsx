import { useLiveQuery } from 'dexie-react-hooks'

import { useFetchDanmakuMutation } from '../../../hooks/useFetchDanmakuMutation'

import type { EpisodeListItemProps } from '@/common/components/animeList/BaseEpisodeListItem'
import { BaseEpisodeListItem } from '@/common/components/animeList/BaseEpisodeListItem'
import { db } from '@/common/db/db'

export const EpisodeListItem = (props: EpisodeListItemProps) => {
  const { episodeId, episodeTitle } = props
  const { fetch, isPending } = useFetchDanmakuMutation()

  const danmakuData = useLiveQuery(
    () => db.danmakuCache.get(episodeId),
    [episodeId]
  )

  const hasDanmaku = !!danmakuData

  const handleFetchDanmaku = async () => {
    await fetch({
      data: props,
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
