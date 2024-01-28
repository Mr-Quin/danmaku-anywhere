import { DanDanAnime, DanDanEpisode } from '@danmaku-anywhere/danmaku-engine'
import { Check } from '@mui/icons-material'
import { LoadingButton } from '@mui/lab'
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
  FormControl,
  FormControlLabel,
  Checkbox,
} from '@mui/material'
import { useRef, useState } from 'react'

import { useDanmakuService } from '../hooks/useDanmakuService'
import { usePopup } from '../store/popupStore'
import { useStore } from '../store/store'

import { AnimeTypeIcon } from '@/common/components/animeList/AnimeTypeIcon'

export const SelectorPanel = () => {
  const selectorBoxRef = useRef<HTMLDivElement>()
  const { animes, saveMapping, setSaveMapping } = usePopup()
  const mediaInfo = useStore((state) => state.mediaInfo)
  const integration = useStore((state) => state.integration)

  const [selectedAnime, setSelectedAnime] = useState<DanDanAnime>()
  const [selectedEpisode, setSelectedEpisode] = useState<DanDanEpisode>()

  const episodes = selectedAnime?.episodes ?? []

  const { fetch, isLoading } = useDanmakuService()

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

    const titleMapping =
      mediaInfo && saveMapping && integration
        ? {
            originalTitle: mediaInfo.toTitleString(),
            title: selectedAnime.animeTitle,
            animeId: selectedAnime.animeId,
            source: integration,
          }
        : undefined

    await fetch(
      {
        animeId: selectedAnime.animeId,
        animeTitle: selectedAnime.animeTitle,
        episodeId: selectedEpisode.episodeId,
        episodeTitle: selectedEpisode.episodeTitle,
      },
      titleMapping
    )
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
        </Stack>
      </Box>
    </Box>
  )
}
