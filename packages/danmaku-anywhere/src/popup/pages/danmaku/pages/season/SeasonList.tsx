import { Suspense, memo, useMemo } from 'react'
import { createSearchParams, useNavigate } from 'react-router'

import { useGetAllSeasonsSuspense } from '@/common/anime/queries/useGetAllSeasonsSuspense'
import {
  SeasonGrid,
  SeasonGridSkeleton,
} from '@/common/components/MediaList/components/SeasonGrid'
import { NothingHere } from '@/common/components/NothingHere'
import { useCustomEpisodeLiteSuspense } from '@/common/danmaku/queries/useCustomEpisodes'
import { isProvider } from '@/common/danmaku/utils'
import { useStoreScrollPosition } from '@/common/hooks/useStoreScrollPosition'
import { matchWithPinyin } from '@/common/utils/utils'
import { useStore } from '@/popup/store'
import {
  type CustomSeason,
  DanmakuSourceType,
} from '@danmaku-anywhere/danmaku-converter'
import { Box } from '@mui/material'
import { useTranslation } from 'react-i18next'

const SeasonListSuspense = () => {
  const navigate = useNavigate()

  const { t } = useTranslation()

  const { data: seasons } = useGetAllSeasonsSuspense()

  const { data: customEpisodes } = useCustomEpisodeLiteSuspense({ all: true })

  const ref = useStoreScrollPosition<HTMLDivElement>('seasonList')

  const { animeFilter: filter, selectedTypes } = useStore.use.danmaku()

  // TODO: find a better way to display custom episodes, injecting a custom season is not ideal
  const seasonsWithCustom = useMemo(() => {
    if (customEpisodes.length === 0) return seasons

    // inject a custom season into the list of seasons
    const customSeason: CustomSeason = {
      provider: DanmakuSourceType.Custom,
      title: t('danmaku.local'),
      type: t('danmaku.local'),
      indexedId: '',
      schemaVersion: 1,
      localEpisodeCount: customEpisodes.length,
      episodeCount: customEpisodes.length,
      version: 0,
      timeUpdated: 0,
      id: 0,
      providerIds: {},
    }
    return [customSeason, ...seasons]
  }, [seasons, customEpisodes])

  const filteredSeasons = useMemo(() => {
    if (!filter && selectedTypes.length === 0) return seasonsWithCustom

    return seasonsWithCustom
      .filter((item) => matchWithPinyin(item.title, filter))
      .filter((item) => selectedTypes.includes(item.provider))
  }, [seasonsWithCustom, filter, selectedTypes])

  if (!filteredSeasons.length) {
    return (
      <Box p={2} flexGrow={1}>
        <NothingHere
          message={
            filter
              ? t('danmakuPage.noResult', { filter: filter })
              : t('danmakuPage.noAnime')
          }
        />
      </Box>
    )
  }

  return (
    <SeasonGrid
      boxProps={{ p: 2 }}
      data={filteredSeasons}
      onSeasonClick={(season) => {
        navigate({
          pathname: `${season.id}`,
          search: createSearchParams({
            type: isProvider(season, DanmakuSourceType.Custom)
              ? 'custom'
              : 'remote',
          }).toString(),
        })
      }}
      virtualize
      ref={ref}
    />
  )
}

const SeasonListBase = () => {
  return (
    <Suspense
      fallback={
        <Box p={2}>
          <SeasonGridSkeleton count={10} />
        </Box>
      }
    >
      <SeasonListSuspense />
    </Suspense>
  )
}

export const SeasonList = memo(SeasonListBase)
