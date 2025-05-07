import { Suspense, useMemo } from 'react'
import { createSearchParams, useNavigate } from 'react-router'

import { NoSeason } from './NoSeason'

import { useGetAllSeasonsSuspense } from '@/common/anime/queries/useGetAllSeasonsSuspense'
import {
  SeasonGrid,
  SeasonGridSkeleton,
} from '@/common/components/MediaList/components/SeasonGrid'
import { useAllCustomEpisodesSuspense } from '@/common/danmaku/queries/useAllCustomEpisodes'
import { isProvider } from '@/common/danmaku/utils'
import { matchWithPinyin } from '@/common/utils/utils'
import { useStore } from '@/popup/store'
import {
  type CustomSeason,
  DanmakuSourceType,
} from '@danmaku-anywhere/danmaku-converter'
import { useTranslation } from 'react-i18next'

const SeasonListSuspense = () => {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const { data: seasons } = useGetAllSeasonsSuspense()

  const { data: customEpisodes } = useAllCustomEpisodesSuspense()

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

  const { animeFilter: filter, selectedTypes } = useStore.use.danmaku()

  const filteredSeasons = useMemo(() => {
    if (!filter) return seasonsWithCustom

    return seasonsWithCustom
      .filter((item) => matchWithPinyin(item.title, filter))
      .filter((item) => selectedTypes.includes(item.provider))
  }, [seasonsWithCustom, filter, selectedTypes])

  if (!filteredSeasons.length) return <NoSeason />

  return (
    <SeasonGrid
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
    />
  )
}

export const SeasonList = () => {
  return (
    <Suspense fallback={<SeasonGridSkeleton count={10} />}>
      <SeasonListSuspense />
    </Suspense>
  )
}
