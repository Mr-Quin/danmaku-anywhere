import { Suspense, useMemo } from 'react'
import { useNavigate } from 'react-router'

import { NoSeason } from './NoSeason'

import { useGetAllSeasonsSuspense } from '@/common/anime/queries/useGetAllSeasonsSuspense'
import {
  SeasonGrid,
  SeasonGridSkeleton,
} from '@/common/components/MediaList/components/SeasonGrid'
import { matchWithPinyin } from '@/common/utils/utils'
import { useStore } from '@/popup/store'

const SeasonListSuspense = () => {
  const navigate = useNavigate()

  const { data } = useGetAllSeasonsSuspense()

  const { animeFilter: filter, selectedTypes } = useStore.use.danmaku()

  const filteredData = useMemo(() => {
    if (!filter) return data

    return data
      .filter((item) => matchWithPinyin(item.title, filter))
      .filter((item) => selectedTypes.includes(item.provider))
  }, [data, filter, selectedTypes])

  if (!filteredData.length) return <NoSeason />

  return (
    <SeasonGrid
      data={filteredData}
      onSeasonClick={(season) => {
        navigate({
          pathname: `${season.id}`,
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
