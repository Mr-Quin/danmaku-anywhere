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
} from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { KeyboardEvent, useEffect } from 'react'

import { useDanmakuService } from '../../hooks/useDanmakuService'
import { usePopup } from '../../store/popupStore'
import { useStore } from '../../store/store'

import { BaseEpisodeListItem } from '@/common/components/animeList/BaseEpisodeListItem'
import { SearchResultList } from '@/common/components/animeList/SearchResultList'
import { DanmakuMeta } from '@/common/db/db'
import { animeMessage } from '@/common/messages/animeMessage'

export const SearchPanel = () => {
  const {
    setAnimes,
    searchTitle,
    setSearchTitle,
    animes,
    saveMapping,
    setSaveMapping,
  } = usePopup()
  const mediaInfo = useStore((state) => state.mediaInfo)
  const integration = useStore((state) => state.integration)

  const { data, isFetching, isFetched, isSuccess, refetch } = useQuery({
    queryKey: ['anime'],
    queryFn: () => animeMessage.search({ anime: searchTitle }),
    enabled: false,
    refetchOnMount: false,
    retry: false,
  })

  const { isLoading: isDanmakuLoading, fetch: fetchDanmaku } =
    useDanmakuService()

  useEffect(() => {
    if (!isSuccess) return

    setAnimes(data.animes)
  }, [isSuccess, data])

  useEffect(() => {
    if (!mediaInfo) return

    setSearchTitle(mediaInfo.title)
  }, [mediaInfo])

  const handleFetchDanmaku = async (meta: DanmakuMeta) => {
    const titleMapping =
      mediaInfo && saveMapping && integration
        ? {
            originalTitle: mediaInfo.toTitleString(),
            title: meta.animeTitle,
            animeId: meta.animeId,
            source: integration,
          }
        : undefined

    await fetchDanmaku(meta, titleMapping)
  }

  const handleTextFieldKeyDown = (e: KeyboardEvent) => {
    // prevent keydown event from triggering global shortcuts
    if (e.key === 'Escape') return
    e.stopPropagation()
  }

  return (
    <Box>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          refetch()
        }}
      >
        <Box py={2} px={2}>
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              label="Anime Title"
              variant="outlined"
              value={searchTitle}
              onKeyDown={handleTextFieldKeyDown}
              onKeyPress={handleTextFieldKeyDown} // required for stopPropagation
              onChange={(e) => {
                setSearchTitle(e.target.value)
              }}
              fullWidth
            />
            <LoadingButton
              type="submit"
              loading={isFetching}
              disabled={searchTitle.length === 0}
              variant="contained"
            >
              <Search />
            </LoadingButton>
          </Stack>
          {true && (
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
                label="Remember selection"
              />
            </FormControl>
          )}
        </Box>
      </form>
      <Collapse in={isFetched} unmountOnExit>
        <Divider />
        <SearchResultList
          dense
          results={animes ?? []}
          renderEpisodes={(episodes, anime) => {
            return episodes.map((episode) => (
              <BaseEpisodeListItem
                episodeTitle={episode.episodeTitle}
                isLoading={isDanmakuLoading}
                showIcon={isDanmakuLoading}
                onClick={() => {
                  handleFetchDanmaku({
                    episodeId: episode.episodeId,
                    episodeTitle: episode.episodeTitle,
                    animeId: anime.animeId,
                    animeTitle: anime.animeTitle,
                  })
                }}
                key={episode.episodeId}
              />
            ))
          }}
        />
      </Collapse>
    </Box>
  )
}
