import {
  type Bookmark,
  type CustomSeason,
  DanmakuSourceType,
  type EpisodeLite,
  type EpisodeStub,
  type GenericEpisodeLite,
} from '@danmaku-anywhere/danmaku-converter'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useGetAllSeasonsSuspense } from '@/common/anime/queries/useGetAllSeasonsSuspense'
import { useBookmarksSuspense } from '@/common/bookmark/queries/useBookmarks'
import type {
  ExtendedTreeItem,
  FolderTreeItem,
} from '@/common/components/DanmakuSelector/tree/ExtendedTreeItem'
import { useCustomEpisodeLiteSuspense } from '@/common/danmaku/queries/useCustomEpisodes'
import { useEpisodesLiteSuspense } from '@/common/danmaku/queries/useEpisodes'
import { isNotCustom, isProvider } from '@/common/danmaku/utils'
import { useProviderConfig } from '@/common/options/providerConfig/useProviderConfig'
import { compareLocale } from '@/common/utils/collator'
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
    if (!typeFilter.includes(option.provider)) {
      return false
    }
    return matchWithPinyin(
      stringifyDanmakuMeta(option),
      filter.toLocaleLowerCase()
    )
  })
}

const getEpisodeNumber = (item: ExtendedTreeItem): number | undefined => {
  if (
    item.kind === 'episode' &&
    isNotCustom(item.data) &&
    item.data.episodeNumber !== undefined
  ) {
    const num = Number(item.data.episodeNumber)
    return Number.isNaN(num) ? undefined : num
  }
  if (item.kind === 'stub' && item.data.episodeNumber !== undefined) {
    const num = Number(item.data.episodeNumber)
    return Number.isNaN(num) ? undefined : num
  }
  return undefined
}

const compareEpisodes = (a: ExtendedTreeItem, b: ExtendedTreeItem) => {
  const aNum = getEpisodeNumber(a)
  const bNum = getEpisodeNumber(b)
  if (aNum !== undefined && bNum !== undefined) {
    return aNum - bNum
  }
  return compareLocale(a.label, b.label)
}

// put folders first, then sort by label
function sortCustomChildren(items: ExtendedTreeItem[]) {
  items.sort((a, b) => {
    if (a.kind === 'folder' && b.kind !== 'folder') {
      return -1
    }
    if (a.kind !== 'folder' && b.kind === 'folder') {
      return 1
    }
    return compareLocale(a.label, b.label)
  })
  for (const item of items) {
    if (item.children) {
      sortCustomChildren(item.children)
    }
  }
}

/**
 * Compute stub episode nodes for a bookmark that are not already fetched locally.
 * Uses the full (unfiltered) episode list to determine what's fetched,
 * then applies the text filter to decide which stubs to show.
 */
function computeBookmarkStubs(
  bookmark: Bookmark,
  fetchedForSeason: EpisodeLite[],
  filter: string,
  seasonTitle: string
): EpisodeStub[] {
  const fetchedIndexedIds = new Set(fetchedForSeason.map((ep) => ep.indexedId))

  const unfetchedStubs = bookmark.episodes.filter(
    (stub) => !fetchedIndexedIds.has(stub.indexedId)
  )

  if (!filter) {
    return unfetchedStubs
  }

  const lowerFilter = filter.toLocaleLowerCase()
  return unfetchedStubs.filter((stub) =>
    matchWithPinyin(`${seasonTitle} ${stub.title}`, lowerFilter)
  )
}

export const useDanmakuTree = (
  filter: string,
  typeFilter: DanmakuSourceType[]
) => {
  const { data: episodes } = useEpisodesLiteSuspense()
  const { data: customEpisodes } = useCustomEpisodeLiteSuspense({ all: true })
  const { data: seasons } = useGetAllSeasonsSuspense({ includeEmpty: true })
  const { data: bookmarks } = useBookmarksSuspense()
  const { getProviderById } = useProviderConfig()

  const { t } = useTranslation()

  const { treeItems, treeItemMap } = useMemo(() => {
    const treeItemMap = new Map<string, ExtendedTreeItem>()
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
      const rootChildren: ExtendedTreeItem[] = []
      const folderMap = new Map<string, FolderTreeItem>()

      const getOrCreateFolder = (pathParts: string[]): ExtendedTreeItem[] => {
        if (pathParts.length === 0) {
          return rootChildren
        }

        const folderPath = pathParts.join('/')
        if (folderMap.has(folderPath)) {
          // biome-ignore lint/style/noNonNullAssertion: safe assertion since we just checked
          return folderMap.get(folderPath)!.children
        }

        const parentPathParts = pathParts.slice(0, -1)
        const parentChildren = getOrCreateFolder(parentPathParts)
        const folderName = pathParts[pathParts.length - 1]

        const newFolder: FolderTreeItem = {
          id: `folder-${folderPath}`,
          label: folderName,
          kind: 'folder',
          folderPath,
          children: [],
        }
        register(newFolder)
        folderMap.set(folderPath, newFolder)
        parentChildren.push(newFolder)

        return newFolder.children
      }

      filteredCustomEpisodes.forEach((ep) => {
        const path = ep.title
        const parts = path.split('/').filter(Boolean)
        const fileName = parts.pop() || ep.title
        const folderPathParts = parts

        const targetChildren = getOrCreateFolder(folderPathParts)

        targetChildren.push(
          register({
            id: `custom-episode-${ep.id}`,
            label: fileName,
            kind: 'episode',
            data: ep,
          })
        )
      })

      sortCustomChildren(rootChildren)

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
          children: rootChildren,
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
      if (!season || !groupEpisodes) {
        return
      }

      const children = groupEpisodes.map((ep) =>
        register({
          id: `episode-${ep.id}`,
          label: ep.title,
          kind: 'episode',
          data: ep,
        })
      )

      children.sort(compareEpisodes)

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

    // Merge bookmark stubs into season nodes
    // Pre-group episodes by seasonId for O(1) lookup
    const episodesBySeason = Object.groupBy(
      episodes.filter(isNotCustom),
      (ep) => ep.seasonId
    )

    for (const bookmark of bookmarks) {
      const season = seasons.find((s) => s.id === bookmark.seasonId)
      if (!season) {
        continue
      }

      if (!typeFilter.includes(season.provider)) {
        continue
      }

      const filteredStubs = computeBookmarkStubs(
        bookmark,
        episodesBySeason[bookmark.seasonId] ?? [],
        filter,
        season.title
      )

      const existingNode = treeItemMap.get(`season-${season.id}`)

      if (filteredStubs.length === 0) {
        if (existingNode?.kind === 'season') {
          existingNode.bookmarked = true
        }
        continue
      }

      const stubNodes = filteredStubs.map((stub) =>
        register({
          id: `stub-${bookmark.seasonId}-${stub.indexedId}`,
          label: stub.title,
          kind: 'stub' as const,
          data: stub,
          seasonId: bookmark.seasonId,
          season,
        })
      )

      if (existingNode?.kind === 'season') {
        // Season node already exists (some episodes are fetched)
        existingNode.children = [...(existingNode.children ?? []), ...stubNodes]
        existingNode.children.sort(compareEpisodes)
        existingNode.bookmarked = true
      } else {
        // Season has no fetched episodes — create node from stubs only
        const seasonNode = register({
          id: `season-${season.id}`,
          label: season.title,
          kind: 'season' as const,
          data: season,
          provider: getProviderById(season.providerConfigId),
          bookmarked: true,
          children: stubNodes.sort(compareEpisodes),
        })
        treeItems.push(seasonNode)
      }
    }

    treeItems.sort((a, b) => {
      if (a.id === 'season-custom') {
        return -1
      }
      if (b.id === 'season-custom') {
        return 1
      }
      return compareLocale(a.label, b.label)
    })

    return { treeItems, treeItemMap }
  }, [
    episodes,
    customEpisodes,
    seasons,
    bookmarks,
    filter,
    typeFilter,
    t,
    getProviderById,
  ])

  return {
    episodes,
    customEpisodes,
    seasons,
    bookmarks,
    treeItems,
    treeItemMap,
  }
}
