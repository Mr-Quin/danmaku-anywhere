import type { DanDanAnimeSearchAPIParams } from '@danmaku-anywhere/danmaku-provider/ddp'
import { Box, Collapse, Typography } from '@mui/material'
import {
  useIsFetching,
  useQueryErrorResetBoundary,
} from '@tanstack/react-query'
import { Suspense, useEffect, useRef, useState, useTransition } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { useTranslation } from 'react-i18next'

import { SearchForm } from './components/SearchForm'

import { DanmakuProviderType } from '@/common/anime/enums'
import { mediaKeys } from '@/common/anime/queries/mediaQueryKeys'
import { Center } from '@/common/components/Center'
import { BaseEpisodeListItem } from '@/common/components/MediaList/components/BaseEpisodeListItem'
import { SearchResultList } from '@/common/components/MediaList/SearchResultList'
import type { DanmakuFetchDto } from '@/common/danmaku/dto'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import { danmakuKeys } from '@/common/danmaku/queries/danmakuQueryKeys'
import { useFetchDanmaku } from '@/common/danmaku/queries/useFetchDanmaku'
import type { DanmakuFetchOptions } from '@/common/danmaku/types'
import { isDanmakuProvider } from '@/common/danmaku/utils'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { TabToolbar } from '@/popup/component/TabToolbar'
import { TabLayout } from '@/popup/layout/TabLayout'
import { useStore } from '@/popup/store'

export const SearchPage = () => {
  const { t } = useTranslation()
  // TODO: useTransition does not yet work with useSyncExternalStore (zustand),
  // so we use useState for now and save the state to the store
  const [searchParams, setSearchParams] = useState<DanDanAnimeSearchAPIParams>()

  const ref = useRef<ErrorBoundary>(null)
  const { reset } = useQueryErrorResetBoundary()

  const savedSearchParams = useStore.use.animeSearchParams?.()

  const [pending, startTransition] = useTransition()

  const { mutate: load } = useFetchDanmaku()

  const handleFetchDanmaku = async (meta: DanmakuFetchDto['meta']) => {
    const fetchOption: DanmakuFetchOptions = {
      forceUpdate: true,
    }
    // some useless conditions to make the typescript compiler happy
    if (isDanmakuProvider(meta, DanmakuSourceType.DDP))
      return load({
        meta,
        options: fetchOption,
      })
    if (isDanmakuProvider(meta, DanmakuSourceType.Bilibili))
      return load({
        meta,
        options: fetchOption,
      })
  }

  const isSearching =
    useIsFetching({
      queryKey: mediaKeys.search(),
    }) > 0

  useEffect(() => {
    if (savedSearchParams) {
      setSearchParams(savedSearchParams)
    }
  }, [])

  const handleSearch = (params: DanDanAnimeSearchAPIParams) => {
    startTransition(() => {
      if (ref.current?.state.didCatch) {
        ref.current.resetErrorBoundary()
      }

      setSearchParams(params)
      useStore.setState({ animeSearchParams: params })
    })
  }

  return (
    <TabLayout>
      <TabToolbar title={t('searchPage.name')} />
      <Box p={2}>
        <SearchForm
          onSearch={handleSearch}
          isLoading={isSearching || pending}
        />
      </Box>
      <ErrorBoundary
        ref={ref}
        onReset={reset}
        fallbackRender={({ error }) => (
          <Center>
            <Typography>There was an error!</Typography>
            <Typography color={(theme) => theme.palette.error.main}>
              {error.message}
            </Typography>
          </Center>
        )}
      >
        <Collapse in={searchParams !== undefined} unmountOnExit mountOnEnter>
          <Suspense fallback={null}>
            <SearchResultList
              providers={[
                DanmakuProviderType.DanDanPlay,
                DanmakuProviderType.Bilibili,
              ]}
              pending={pending}
              searchParams={searchParams!}
              dense
              renderEpisode={(provider, episode, meta) => {
                if (provider === DanmakuProviderType.Bilibili)
                  return (
                    <BaseEpisodeListItem
                      showIcon
                      episodeTitle={episode.long_title || episode.share_copy}
                      tooltip={episode.share_copy}
                      queryKey={danmakuKeys.one({
                        provider: DanmakuSourceType.Bilibili,
                        episodeId: episode.cid,
                      })}
                      queryDanmaku={async () => {
                        return await chromeRpcClient.danmakuGetOne({
                          provider: DanmakuSourceType.Bilibili,
                          episodeId: episode.cid,
                        })
                      }}
                      mutateDanmaku={() =>
                        handleFetchDanmaku({
                          cid: episode.cid,
                          aid: episode.aid,
                          seasonId: meta.season_id,
                          title: episode.long_title || episode.share_copy,
                          seasonTitle: meta.title,
                          mediaType: meta.type,
                          provider: DanmakuSourceType.Bilibili,
                        })
                      }
                      secondaryText={(data) =>
                        `${new Date(data.timeUpdated).toLocaleDateString()} -  ${t(
                          'danmaku.commentCounted',
                          {
                            count: data.commentCount,
                          }
                        )}`
                      }
                      key={episode.cid}
                    />
                  )

                const { episodeTitle, episodeId } = episode
                const { animeId, animeTitle } = meta

                return (
                  <BaseEpisodeListItem
                    showIcon
                    episodeTitle={episodeTitle}
                    queryKey={danmakuKeys.one({
                      provider: DanmakuSourceType.DDP,
                      episodeId: episodeId,
                    })}
                    queryDanmaku={async () => {
                      return await chromeRpcClient.danmakuGetOne({
                        provider: DanmakuSourceType.DDP,
                        episodeId: episodeId,
                      })
                    }}
                    mutateDanmaku={() =>
                      handleFetchDanmaku({
                        episodeId,
                        episodeTitle,
                        animeId: animeId,
                        animeTitle: animeTitle,
                        provider: DanmakuSourceType.DDP,
                      })
                    }
                    secondaryText={(data) =>
                      `${new Date(data.timeUpdated).toLocaleDateString()} -  ${t(
                        'danmaku.commentCounted',
                        {
                          count: data.commentCount,
                        }
                      )}`
                    }
                    key={episodeId}
                  />
                )
              }}
            />
          </Suspense>
        </Collapse>
      </ErrorBoundary>
    </TabLayout>
  )
}
