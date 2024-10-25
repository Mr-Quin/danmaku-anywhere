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

import { mediaKeys } from '@/common/anime/queries/mediaQueryKeys'
import { Center } from '@/common/components/Center'
import { BaseEpisodeListItem } from '@/common/components/MediaList/components/BaseEpisodeListItem'
import { SearchResultList } from '@/common/components/MediaList/SearchResultList'
import type { DanmakuFetchDto } from '@/common/danmaku/dto'
import { useFetchDanmaku } from '@/common/danmaku/queries/useFetchDanmaku'
import { useDanmakuSources } from '@/common/options/extensionOptions/useDanmakuSources'
import { useStore } from '@/popup/store'

export const SearchTab = () => {
  const { t } = useTranslation()
  // TODO: useTransition does not yet work with useSyncExternalStore (zustand),
  // so we use useState for now and save the state to the store
  const [searchParams, setSearchParams] = useState<DanDanAnimeSearchAPIParams>()

  const { enabledProviders } = useDanmakuSources()

  const ref = useRef<ErrorBoundary>(null)
  const { reset } = useQueryErrorResetBoundary()

  const savedSearchParams = useStore.use.animeSearchParams?.()

  const [pending, startTransition] = useTransition()

  const { mutateAsync: load } = useFetchDanmaku()

  const handleFetchDanmaku = async (meta: DanmakuFetchDto['meta']) => {
    return await load({
      meta,
      options: {
        forceUpdate: true,
      },
    } as DanmakuFetchDto)
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

  if (!enabledProviders.length) {
    return (
      <Center>
        <Typography>{t('searchPage.error.noProviders')}</Typography>
      </Center>
    )
  }

  return (
    <>
      <Box p={2}>
        <SearchForm
          onSearch={handleSearch}
          isLoading={isSearching || pending}
        />
      </Box>
      <ErrorBoundary
        ref={ref}
        onReset={reset}
        onError={console.error}
        fallbackRender={({ error }) => (
          <Center>
            <Typography>There was an error!</Typography>
            <Typography color="error">{error.message}</Typography>
          </Center>
        )}
      >
        <Collapse in={searchParams !== undefined} unmountOnExit mountOnEnter>
          <Suspense fallback={null}>
            <SearchResultList
              providers={enabledProviders}
              pending={pending}
              searchParams={searchParams!}
              dense
              renderEpisode={(data) => {
                return (
                  <BaseEpisodeListItem
                    data={data}
                    showIcon
                    mutateDanmaku={(meta) => handleFetchDanmaku(meta)}
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
              }}
            />
          </Suspense>
        </Collapse>
      </ErrorBoundary>
    </>
  )
}
