import type { DanDanAnimeSearchAPIParams } from '@danmaku-anywhere/danmaku-provider/ddp'
import { Search } from '@mui/icons-material'
import { LoadingButton } from '@mui/lab'
import {
  Box,
  Checkbox,
  Collapse,
  Divider,
  FormControl,
  FormControlLabel,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import {
  useIsFetching,
  useQueryErrorResetBoundary,
} from '@tanstack/react-query'
import { Suspense, useEffect, useRef, useState, useTransition } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { useTranslation } from 'react-i18next'

import { EpisodeListItem } from './EpisodeListItem'

import { Center } from '@/common/components/Center'
import { FullPageSpinner } from '@/common/components/FullPageSpinner'
import { SearchResultList } from '@/common/components/MediaList/SearchResultList'
import { useDanmakuSources } from '@/common/options/extensionOptions/useDanmakuSources'
import { mediaQueryKeys } from '@/common/queries/queryKeys'
import { withStopPropagation } from '@/common/utils/withStopPropagation'
import { usePopup } from '@/content/controller/store/popupStore'
import { useStore } from '@/content/controller/store/store'

export const SearchPage = () => {
  const { t } = useTranslation()
  const { searchTitle, saveMapping, setSearchTitle, setSaveMapping } =
    usePopup()
  const { mediaInfo } = useStore.use.integration()

  const { enabledProviders } = useDanmakuSources()

  const [searchParams, setSearchParams] = useState<DanDanAnimeSearchAPIParams>()

  const ref = useRef<ErrorBoundary>(null)
  const { reset } = useQueryErrorResetBoundary()

  const [pending, startTransition] = useTransition()

  const isSearching =
    useIsFetching({
      queryKey: mediaQueryKeys.search(),
    }) > 0

  useEffect(() => {
    if (!mediaInfo) return

    setSearchTitle(mediaInfo.title)
  }, [mediaInfo])

  const handleSearch = () => {
    startTransition(() => {
      if (ref.current?.state.didCatch) {
        ref.current.resetErrorBoundary()
      }

      setSearchParams({ anime: searchTitle })
    })
  }

  const getContext = () => {
    if (!mediaInfo || !saveMapping) return undefined

    return {
      key: mediaInfo.key(),
    }
  }

  if (!enabledProviders.length) {
    return (
      <Box flexGrow={1}>
        <Center>
          <Typography>{t('searchPage.error.noProviders')}</Typography>
        </Center>
      </Box>
    )
  }

  return (
    <Box flexGrow={1} sx={{ overflowX: 'hidden' }}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleSearch()
        }}
      >
        <Box py={2} px={2}>
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              label={t('searchPage.title')}
              variant="outlined"
              value={searchTitle}
              {...withStopPropagation()}
              onChange={(e) => {
                setSearchTitle(e.target.value)
              }}
              fullWidth
              required
            />
            <LoadingButton
              type="submit"
              loading={isSearching || pending}
              disabled={searchTitle.length === 0}
              variant="contained"
            >
              <Search />
            </LoadingButton>
          </Stack>
          {!!mediaInfo && (
            <FormControl>
              <FormControlLabel
                control={
                  <Checkbox
                    inputProps={{ 'aria-label': 'controlled' }}
                    checked={saveMapping}
                    onChange={(e) => {
                      setSaveMapping(e.target.checked)
                    }}
                  />
                }
                label={t('searchPage.saveMapping')}
              />
            </FormControl>
          )}
        </Box>
      </form>
      <ErrorBoundary
        ref={ref}
        onReset={reset}
        fallbackRender={({ error }) => (
          <Center>
            <Typography>There was an error!</Typography>
            <Typography color="error">{error.message}</Typography>
          </Center>
        )}
      >
        <Collapse in={searchParams !== undefined} unmountOnExit>
          <Suspense fallback={<FullPageSpinner />}>
            <Divider />
            <SearchResultList
              providers={enabledProviders}
              searchParams={searchParams!}
              dense
              pending={pending}
              renderEpisode={(data) => {
                return <EpisodeListItem context={getContext()} data={data} />
              }}
            />
          </Suspense>
        </Collapse>
      </ErrorBoundary>
    </Box>
  )
}
