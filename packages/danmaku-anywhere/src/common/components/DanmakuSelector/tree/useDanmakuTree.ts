import {
  type CustomSeason,
  DanmakuSourceType,
  type GenericEpisodeLite,
} from '@danmaku-anywhere/danmaku-converter'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useGetAllSeasonsSuspense } from '@/common/anime/queries/useGetAllSeasonsSuspense'
import type { ExtendedTreeItem } from '@/common/components/DanmakuSelector/tree/ExtendedTreeItem'
import { useCustomEpisodeLiteSuspense } from '@/common/danmaku/queries/useCustomEpisodes'
import { useEpisodesLiteSuspense } from '@/common/danmaku/queries/useEpisodes'
import { isProvider } from '@/common/danmaku/utils'
import { useProviderConfig } from '@/common/options/providerConfig/useProviderConfig'
import { matchWithPinyin } from '@/common/utils/utils'

const stringifyDanmakuMeta = (episode: GenericEpisodeLite) => {
  if (isProvider(episode, DanmakuSourceType.MacCMS)) {
    return episode.title
  }
  return `${episode.season.title} ${episode.title}`
}

const filterEpisodes = <T extends GenericEpisodeLite>(
  options: T[],
  filter: string,
  typeFilter: DanmakuSourceType[]
) => {
  if (!filter) {
    return options.filter((option) => {
      return typeFilter.includes(option.provider)
    })
  }

  return options.filter((option) => {
    if (!typeFilter.includes(option.provider)) return false
    return matchWithPinyin(
      stringifyDanmakuMeta(option),
      filter.toLocaleLowerCase()
    )
  })
}

export const useDanmakuTree = (
  filter: string,
  typeFilter: DanmakuSourceType[]
) => {
  const { data: episodes } = useEpisodesLiteSuspense()
  const { data: customEpisodes } = useCustomEpisodeLiteSuspense({ all: true })
  const { data: seasons } = useGetAllSeasonsSuspense()
  const { getProviderById } = useProviderConfig()

  const { t } = useTranslation()

  const { treeItems, treeItemMap } = useMemo(() => {
    // map of item id to tree item
    const treeItemMap = new Map<string, ExtendedTreeItem>()
    // list of tree items
    const treeItems: ExtendedTreeItem[] = []

    function register(item: ExtendedTreeItem) {
      treeItemMap.set(item.id, item)
      return item
    }

    const filteredEpisodes = filterEpisodes(episodes, filter, typeFilter)
    const filteredCustomEpisodes = filterEpisodes(
      customEpisodes,
      filter,
      typeFilter
    )

    // Handle Custom Episodes (Local)
    if (filteredCustomEpisodes.length > 0) {
      const children = filteredCustomEpisodes.map((ep) =>
        register({
          id: `custom-episode-${ep.id}`,
          label: ep.title,
          kind: 'episode',
          data: ep,
        })
      )

      const customSeason: CustomSeason = {
        title: t('danmaku.local', 'Local Danmaku'),
        type: t('danmaku.local', 'Local Danmaku'),
        indexedId: '',
        schemaVersion: 1,
        version: 0,
        timeUpdated: 0,
        id: -1,
        provider: DanmakuSourceType.MacCMS,
        providerIds: {},
      }

      treeItems.push(
        register({
          id: 'season-custom',
          label: t('danmaku.local', 'Local Danmaku'),
          kind: 'season',
          data: customSeason,
          provider: getProviderById(DanmakuSourceType.MacCMS),
          children,
        })
      )
    }

    // Handle Regular Seasons
    const groupedBySeason = Object.groupBy(
      filteredEpisodes,
      (item) => item.seasonId
    )

    Object.entries(groupedBySeason).forEach(([seasonId, groupEpisodes]) => {
      const season = seasons.find((s) => s.id.toString() === seasonId)
      if (!season || !groupEpisodes) return

      const children = groupEpisodes.map((ep) =>
        register({
          id: `episode-${ep.id}`,
          label: ep.title,
          kind: 'episode',
          data: ep,
        })
      )

      treeItems.push(
        register({
          id: `season-${season.id}`,
          label: season.title,
          kind: 'season',
          data: season,
          provider: getProviderById(season.providerConfigId),
          children,
        })
      )
    })

    return { treeItems, treeItemMap }
  }, [
    episodes,
    customEpisodes,
    seasons,
    filter,
    typeFilter,
    t,
    getProviderById,
  ])

  return {
    episodes,
    customEpisodes,
    seasons,
    treeItems,
    treeItemMap,
  }
}
