import {
  DanmakuSourceType,
  type EpisodeMeta,
  type WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import { Search } from '@mui/icons-material'
import {
  Chip,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { Suspense, useState } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { useTranslation } from 'react-i18next'
import { BookmarkToggleButton } from '@/common/bookmark/components/BookmarkToggleButton'
import { BaseEpisodeListItem } from '@/common/components/EpisodeList/BaseEpisodeListItem'
import { EpisodeSearchList } from '@/common/components/EpisodeList/EpisodeSearchList'
import { MacCmsEpisodeListItem } from '@/common/components/EpisodeList/MacCmsEpisodeListItem'
import { ErrorMessage } from '@/common/components/ErrorMessage'
import { ScrollBox } from '@/common/components/layout/ScrollBox'
import { TabLayout } from '@/common/components/layout/TabLayout'
import { TabToolbar } from '@/common/components/layout/TabToolbar'
import { useFetchDanmaku } from '@/common/danmaku/queries/useFetchDanmaku'
import { useFetchGenericDanmaku } from '@/common/danmaku/queries/useFetchGenericDanmaku'
import { assertProviderConfigImpl } from '@/common/options/providerConfig/utils'
import { useGoBack } from '@/popup/hooks/useGoBack'
import { useStore } from '@/popup/store'

export const SeasonDetailsPage = () => {
  const { t } = useTranslation()
  const { season, provider } = useStore.use.search()
  const goBack = useGoBack()
  const [filter, setFilter] = useState('')

  if (!season || !provider) return null

  const episodes = 'episodes' in season ? season.episodes : undefined
  const episodeCount = Array.isArray(episodes) ? episodes.length : undefined

  return (
    <TabLayout>
      <TabToolbar title={season.title} showBackButton onGoBack={goBack}>
        <BookmarkToggleButton season={season} />
      </TabToolbar>
      <Stack spacing={0.75} sx={{ px: 1.25, pt: 1, pb: 0.5, flexShrink: 0 }}>
        <TextField
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={t('searchPage.filterEpisodes', 'Filter episodes…')}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start" sx={{ mr: 0.5 }}>
                  <Search sx={{ fontSize: 14, color: 'text.secondary' }} />
                </InputAdornment>
              ),
              endAdornment:
                typeof episodeCount === 'number' ? (
                  <InputAdornment position="end">
                    <Chip
                      label={episodeCount}
                      size="small"
                      sx={{ height: 18, fontSize: 10 }}
                    />
                  </InputAdornment>
                ) : undefined,
            },
          }}
        />
        <Typography
          variant="caption"
          sx={{
            color: 'text.secondary',
          }}
        >
          {t(
            'searchPage.episodesHint',
            'Tap an episode to download. Downloaded ones show in your library.'
          )}
        </Typography>
      </Stack>
      <ScrollBox
        sx={{ overflow: 'auto', flex: 1, minHeight: 0, px: 0.5, pb: 1 }}
      >
        <ErrorBoundary
          fallbackRender={({ error }) => (
            <ErrorMessage message={(error as Error).message} />
          )}
        >
          <Suspense fallback={null}>
            <EpisodeSearchList
              season={season}
              filter={filter}
              renderEpisode={(data) => {
                const { mutateAsync: load, isPending } = useFetchDanmaku()

                const handleFetchDanmaku = async (
                  meta: WithSeason<EpisodeMeta>
                ) => {
                  return await load({
                    type: 'by-meta',
                    meta,
                    options: { forceUpdate: true },
                  })
                }

                return (
                  <BaseEpisodeListItem
                    isLoading={isPending || data.isLoading}
                    episode={data.danmaku ?? data.episode}
                    index={data.index}
                    onClick={(meta) => handleFetchDanmaku(meta)}
                  />
                )
              }}
              renderCustomEpisode={(data) => {
                const mutation = useFetchGenericDanmaku()

                assertProviderConfigImpl(provider, DanmakuSourceType.MacCMS)

                return (
                  <MacCmsEpisodeListItem
                    onClick={() =>
                      mutation.mutate({
                        ...data.episode,
                        providerConfigId: provider.id,
                      })
                    }
                    isLoading={mutation.isPending}
                    episode={data.episode}
                    index={data.index}
                    danmaku={mutation.data}
                  />
                )
              }}
            />
          </Suspense>
        </ErrorBoundary>
      </ScrollBox>
    </TabLayout>
  )
}
