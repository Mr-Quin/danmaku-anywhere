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
import { useFetchDanmaku } from '@/common/danmaku/queries/useFetchDanmaku'
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
    </TabLayout>
  )
}
