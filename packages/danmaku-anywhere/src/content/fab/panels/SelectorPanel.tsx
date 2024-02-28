import type {
  DanDanAnime,
  DanDanEpisode,
} from '@danmaku-anywhere/danmaku-engine'
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
  FormHelperText,
} from '@mui/material'
import { useRef, useState } from 'react'

import { useFetchDanmakuMutation } from '../../hooks/useFetchDanmakuMutation'
import { usePopup } from '../../store/popupStore'
import { useStore } from '../../store/store'

import { AnimeTypeIcon } from '@/common/components/animeList/AnimeTypeIcon'

export const SelectorPanel = () => {
  const selectorBoxRef = useRef<HTMLDivElement>()
  const { animes, saveMapping, setSaveMapping, close } = usePopup()
  const mediaInfo = useStore((state) => state.mediaInfo)
  const integration = useStore((state) => state.integration)

  const [selectedAnime, setSelectedAnime] = useState<DanDanAnime>()
  const [selectedEpisode, setSelectedEpisode] = useState<DanDanEpisode>()

  const episodes = selectedAnime?.episodes ?? []

  const { fetch, isPending } = useFetchDanmakuMutation()

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

    await fetch({
      danmakuMeta: {
        ...selectedAnime,
        ...selectedEpisode,
      },
      titleMapping,
    })

    close()
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
      <Typography variant="body1" p={2}>
        Multile matches found for {mediaInfo?.toTitleString()}, please select
      </Typography>
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
            loading={isPending}
            variant="contained"
            size="small"
            onClick={handleApply}
            disabled={!selectedAnime || isPending}
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
                  disabled={!selectedAnime}
                />
              }
              label="Remember selection"
            />
            {selectedAnime && (
              <FormHelperText>
                {`Remember "${mediaInfo?.toTitleString()}" as "${
                  selectedAnime?.animeTitle
                }"`}
              </FormHelperText>
            )}
          </FormControl>
        </Stack>
      </Box>
    </Box>
  )
}
