import { BaseEpisodeListItem } from '@/common/components/MediaList/components/BaseEpisodeListItem'
import type { RenderEpisodeData } from '@/common/components/MediaList/types'
import type { DanmakuFetchDto } from '@/common/danmaku/dto'
import { useLoadDanmaku } from '@/content/controller/common/hooks/useLoadDanmaku'

interface EpisodeListItemProps {
  data: RenderEpisodeData
  seasonMapKey?: string
}

export const EpisodeListItem = ({
  seasonMapKey,
  data,
}: EpisodeListItemProps) => {
  const { loadMutation } = useLoadDanmaku()

  const handleFetchDanmaku = async (meta: DanmakuFetchDto['meta']) => {
    await loadMutation.mutateAsync({
      meta,
      options: {
        forceUpdate: true,
      },
      context: {
        seasonMapKey,
      },
    })
  }

  return (
    <BaseEpisodeListItem
      showIcon
      data={data}
      mutateDanmaku={handleFetchDanmaku}
    />
  )
}
