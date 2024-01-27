import { useLiveQuery } from 'dexie-react-hooks'

import {
  EpisodeListItemProps,
  BaseEpisodeListItem,
} from '../../common/components/animeList/BaseEpisodeListItem'
import { useFetchDanmaku } from '../hooks/useFetchDanmaku'

import { db } from '@/common/db/db'

export const EpisodeListItem = (props: EpisodeListItemProps) => {
  const { episodeId, episodeTitle } = props
  const { fetch, isLoading } = useFetchDanmaku()

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
      isLoading={isLoading}
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
