import { useTranslation } from 'react-i18next'

import { BaseEpisodeListItem } from '@/common/components/MediaList/components/BaseEpisodeListItem'
import type { RenderEpisodeData } from '@/common/components/MediaList/types'
import type { DanmakuFetchContext, DanmakuFetchDto } from '@/common/danmaku/dto'
import { useLoadDanmaku } from '@/content/controller/common/hooks/useLoadDanmaku'

interface EpisodeListItemProps {
  context?: DanmakuFetchContext
  data: RenderEpisodeData
}

export const EpisodeListItem = ({ context, data }: EpisodeListItemProps) => {
  const { t } = useTranslation()
  const { loadMutation } = useLoadDanmaku()

  const handleFetchDanmaku = async (meta: DanmakuFetchDto['meta']) => {
    await loadMutation.mutateAsync({
      meta,
      options: {
        forceUpdate: true,
      },
      context,
    } as DanmakuFetchDto)
  }

  return (
    <BaseEpisodeListItem
      showIcon
      data={data}
      mutateDanmaku={handleFetchDanmaku}
      renderSecondaryText={(data) =>
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
