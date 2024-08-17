import { List, ListItemText } from '@mui/material'
import { Suspense } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { match } from 'ts-pattern'

import type {
  BilibiliMediaSearchResult,
  DanDanPlayMediaSearchResult,
  MediaSearchResult,
} from '@/common/anime/dto'
import { BilibiliEpisodeList } from '@/common/components/MediaList/bilibili/BilibiliEpisodeList'
import { CollapsableListItems } from '@/common/components/MediaList/components/CollapsableListItems'
import { ListItemSkeleton } from '@/common/components/MediaList/components/ListItemSkeleton'
import {
  getBilibiliMediaIcon,
  getDanDanPlayMediaIcon,
} from '@/common/components/MediaList/components/makeIcon'
import { MediaTypeIcon } from '@/common/components/MediaList/components/MediaTypeIcon'
import type { RenderEpisode } from '@/common/components/MediaList/types'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import { UnsupportedProviderException } from '@/common/danmaku/UnsupportedProviderException'
import { stripHtml } from '@/common/utils/utils'

const renderSeasonContent = <T extends MediaSearchResult>(
  provider: T['provider'],
  season: T['data'][number],
  renderEpisodes: SeasonListProps['renderEpisode'],
  dense?: boolean
) => {
  if (provider === DanmakuSourceType.Bilibili) {
    const bilibiliSeason = season as BilibiliMediaSearchResult['data'][number]
    return (
      <BilibiliEpisodeList
        season={bilibiliSeason}
        renderEpisode={renderEpisodes}
      />
    )
  } else {
    const danDanPlaySeason =
      season as DanDanPlayMediaSearchResult['data'][number]
    return (
      <List dense={dense} disablePadding>
        {danDanPlaySeason.episodes.map((episode) => {
          return (
            <ErrorBoundary
              fallback={<ListItemText primary="An error occurred" />}
              key={episode.episodeId}
            >
              <Suspense fallback={<ListItemSkeleton />}>
                {renderEpisodes({
                  provider: DanmakuSourceType.DanDanPlay,
                  episode,
                  season: danDanPlaySeason,
                })}
              </Suspense>
            </ErrorBoundary>
          )
        })}
      </List>
    )
  }
}

/*
  TODO: unfortunately TypeScript does not seem to support narrowing discriminated union using a literal discriminator,
  so we have to cast the type using 'as'
  https://github.com/microsoft/TypeScript/issues/46899
 */
const renderSeasonIcon = (
  provider: MediaSearchResult['provider'],
  season: MediaSearchResult['data'][number]
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
    .otherwise((provider) => {
      throw new UnsupportedProviderException(provider)
    })

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
            {renderSeasonContent(data.provider, season, renderEpisode, dense)}
          </Suspense>
        </ErrorBoundary>
      </CollapsableListItems>
    )
  })
}
