import { ListItemText } from '@mui/material'
import { Suspense } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { match } from 'ts-pattern'

import type {
  BilibiliMediaSearchResult,
  DanDanPlayMediaSearchResult,
  MediaSearchResult,
  MediaSeason,
  TencentMediaSearchResult,
} from '@/common/anime/dto'
import { CollapsableListItems } from '@/common/components/MediaList/components/CollapsableListItems'
import { ListItemSkeleton } from '@/common/components/MediaList/components/ListItemSkeleton'
import {
  getBilibiliMediaIcon,
  getDanDanPlayMediaIcon,
  getTencentMediaIcon,
} from '@/common/components/MediaList/components/makeIcon'
import { MediaTypeIcon } from '@/common/components/MediaList/components/MediaTypeIcon'
import { SeasonListItem } from '@/common/components/MediaList/components/SeasonListItem'
import type { RenderEpisode } from '@/common/components/MediaList/types'
import type { RemoteDanmakuSourceType } from '@/common/danmaku/enums'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import { stripHtml } from '@/common/utils/utils'

/*
  TODO: unfortunately TypeScript does not seem to support narrowing discriminated union using a literal discriminator,
  so we have to cast the type using 'as'
  https://github.com/microsoft/TypeScript/issues/46899
 */
const renderSeasonIcon = (
  provider: RemoteDanmakuSourceType,
  season: MediaSeason
) => {
  const { icon, description, primaryText } = match(provider)
    .with(DanmakuSourceType.Bilibili, () => {
      const bilibiliSeason = season as BilibiliMediaSearchResult['data'][number]

      return {
        icon: getBilibiliMediaIcon(bilibiliSeason.media_type),
        description: bilibiliSeason.season_type_name,
        primaryText: stripHtml(bilibiliSeason.title),
      }
    })
    .with(DanmakuSourceType.DanDanPlay, () => {
      const danDanPlaySeason =
        season as DanDanPlayMediaSearchResult['data'][number]

      return {
        icon: getDanDanPlayMediaIcon(danDanPlaySeason.type),
        description: danDanPlaySeason.typeDescription,
        primaryText: danDanPlaySeason.animeTitle,
      }
    })
    .with(DanmakuSourceType.Tencent, () => {
      const tencentSeason = season as TencentMediaSearchResult['data'][number]

      return {
        icon: getTencentMediaIcon(tencentSeason.videoInfo.videoType),
        description: tencentSeason.videoInfo.typeName,
        primaryText: stripHtml(tencentSeason.videoInfo.title),
      }
    })
    .exhaustive()

  return (
    <>
      <MediaTypeIcon icon={icon} description={description} />
      <ListItemText primary={primaryText} />
    </>
  )
}

interface SeasonListProps {
  data: MediaSearchResult
  renderEpisode: RenderEpisode
  dense: boolean
}

export const SeasonsList = ({
  data,
  renderEpisode,
  dense,
}: SeasonListProps) => {
  return data.data.map((season, index) => {
    return (
      <CollapsableListItems
        listItemChildren={renderSeasonIcon(data.provider, season)}
        key={index}
      >
        <ErrorBoundary fallback={<ListItemText primary="An error occurred" />}>
          <Suspense fallback={<ListItemSkeleton />}>
            <SeasonListItem
              provider={data.provider}
              season={season}
              renderEpisodes={renderEpisode}
              dense={dense}
            />
          </Suspense>
        </ErrorBoundary>
      </CollapsableListItems>
    )
  })
}
