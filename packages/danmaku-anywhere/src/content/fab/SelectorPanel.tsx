import { useRef, useState } from 'react'
import {
  Box,
  Autocomplete,
  TextField,
  Stack,
  List,
  ListItemText,
  ListItemButton,
  Divider,
  Typography,
} from '@mui/material'

import { DanDanAnime, DanDanEpisode } from '@danmaku-anywhere/danmaku-engine'
import { LoadingButton } from '@mui/lab'
import { Check } from '@mui/icons-material'
import { usePopup } from '../store/popupStore'
import { useFetchAndSetDanmaku } from '../hooks/useFetchAndSetDanmaku'
import { AnimeTypeIcon } from '@/common/components/animeList/AnimeTypeIcon'

export const SelectorPanel = () => {
  const selectorBoxRef = useRef<HTMLDivElement>()
  const { animes } = usePopup()

  const [selectedAnime, setSelectedAnime] = useState<DanDanAnime>()
  const [selectedEpisode, setSelectedEpisode] = useState<DanDanEpisode>()

  const episodes = selectedAnime?.episodes ?? []

  const { fetch, isLoading } = useFetchAndSetDanmaku()

  const handleAnimeSelect = (anime: DanDanAnime) => {
    setSelectedAnime(anime)
    setSelectedEpisode(anime.episodes[0])
    selectorBoxRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
    })
  }

  const handleApply = async () => {
    if (!selectedAnime || !selectedEpisode) return

    await fetch({
      animeId: selectedAnime.animeId,
      animeTitle: selectedAnime.animeTitle,
      episodeId: selectedEpisode.episodeId,
      episodeTitle: selectedEpisode.episodeTitle,
    })
  }

  if (animes.length === 0) {
    return (
      <Box p={2}>
        <Typography variant="h6">Nothing to select from</Typography>
      </Box>
    )
  }

  return (
    <Box>
      <List disablePadding dense>
        {animes.map((anime) => {
          return (
            <ListItemButton
              onClick={() => handleAnimeSelect(anime)}
              key={anime.animeId}
            >
              <AnimeTypeIcon
                type={anime.type}
                typeDescription={anime.typeDescription}
              />
              <ListItemText primary={anime.animeTitle} />
              {anime === selectedAnime && <Check />}
            </ListItemButton>
          )
        })}
      </List>
      <Divider />

      <Box my={2} px={2} ref={selectorBoxRef}>
        <Stack direction="column" alignItems="flex-start" spacing={2}>
          {episodes.length > 1 && (
            <Autocomplete
              value={selectedEpisode} // value must be null when empty so that the component is "controlled"
              options={episodes}
              isOptionEqualToValue={(option, value) => {
                return option.episodeId === value.episodeId
              }}
              onChange={(e, value) => {
                if (value) {
                  setSelectedEpisode(value)
                }
              }}
              getOptionLabel={(option) => option.episodeTitle}
              renderInput={(params) => {
                return <TextField {...params} label="Episode" />
              }}
              disableClearable
              fullWidth
            />
          )}

          <LoadingButton
            type="submit"
            loading={isLoading}
            variant="contained"
            size="small"
            onClick={handleApply}
            disabled={!selectedAnime || isLoading}
          >
            Select
          </LoadingButton>
        </Stack>
      </Box>
    </Box>
  )
}
