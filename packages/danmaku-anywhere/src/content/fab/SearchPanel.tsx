import { Search } from '@mui/icons-material'
import { LoadingButton } from '@mui/lab'
import { Box, Collapse, Divider, Stack, TextField } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'

import { useFetchAndSetDanmaku } from '../hooks/useFetchAndSetDanmaku'
import { usePopup } from '../store/popupStore'
import { useStore } from '../store/store'

import { BaseEpisodeListItem } from '@/common/components/animeList/BaseEpisodeListItem'
import { SearchResultList } from '@/common/components/animeList/SearchResultList'
import { animeMessage } from '@/common/messages/animeMessage'

export const SearchPanel = () => {
  const { setAnimes, searchTitle, setSearchTitle, animes } = usePopup()
  const { mediaInfo } = useStore()

  const { data, isFetching, isFetched, isSuccess, refetch } = useQuery({
    queryKey: ['anime'],
    queryFn: () => animeMessage.search({ anime: searchTitle }),
    enabled: false,
    refetchOnMount: false,
    retry: false,
  })

  const { isLoading: isDanmakuLoading, fetch: fetchAndSetDanmaku } =
    useFetchAndSetDanmaku()

  useEffect(() => {
    if (!isSuccess) return

    setAnimes(data.animes)
  }, [isSuccess, data])

  useEffect(() => {
    if (!mediaInfo) return

    setSearchTitle(mediaInfo.title)
  }, [mediaInfo])

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
              onChange={(e) => setSearchTitle(e.target.value)}
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
                  fetchAndSetDanmaku({
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
