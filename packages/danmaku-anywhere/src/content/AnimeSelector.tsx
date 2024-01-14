import { forwardRef, useState } from 'react'
import {
  Chip,
  Paper,
  Box,
  Autocomplete,
  TextField,
  Button,
  Typography,
  Stack,
  IconButton,
  Slide,
  CircularProgress,
} from '@mui/material'
import { DanDanAnime, DanDanEpisode } from '@danmaku-anywhere/danmaku-engine'
import { Close } from '@mui/icons-material'
import { usePopup } from './store/popupStore'
import { useStore } from './store/store'
import { makeAnimeIcon } from '@/common/components/makeIcon'
import { useFetchDanmaku } from '@/popup/hooks/useFetchDanmaku'

const AnimeSelector = forwardRef<HTMLDivElement>((props, ref) => {
  const { close, animes } = usePopup()
  const { setComments } = useStore((state) => {
    return {
      setComments: state.setComments,
    }
  })

  const { fetch, isLoading } = useFetchDanmaku()

  const [selectedAnime, setSelectedAnime] = useState<DanDanAnime>()
  const [selectedEpisode, setSelectedEpisode] = useState<DanDanEpisode>()

  const episodes = selectedAnime?.episodes ?? []

  const handleAnimeSelect = (anime: DanDanAnime) => {
    setSelectedAnime(anime)
    setSelectedEpisode(anime.episodes[0])
  }

  const handleApply = async () => {
    if (!selectedAnime || !selectedEpisode) return

    const res = await fetch({
      data: {
        animeId: selectedAnime.animeId,
        animeTitle: selectedAnime.animeTitle,
        episodeId: selectedEpisode.episodeId,
        episodeTitle: selectedEpisode.episodeTitle,
      },
      options: {
        forceUpdate: false,
      },
    })

    if (!res) return
    setComments(res.comments)
    close()
  }

  return (
    <Paper
      sx={{
        py: 1,
        px: 2,
      }}
      elevation={1}
      ref={ref}
    >
      <Stack direction="column" spacing={2}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Typography variant="h6">Anime Disambiguation</Typography>
          <IconButton onClick={close}>
            <Close />
          </IconButton>
        </Stack>
        <Typography variant="body2">Which anime are you watching?</Typography>
        <Box>
          {animes.map((anime) => (
            <Chip
              icon={makeAnimeIcon(anime.type)}
              key={anime.animeId}
              label={anime.animeTitle}
              onClick={() => handleAnimeSelect(anime)}
              color={selectedAnime === anime ? 'primary' : 'default'}
              style={{ marginRight: 8 }}
            />
          ))}
        </Box>
        {episodes.length > 1 ? (
          <Autocomplete
            value={selectedEpisode ?? null} // value must be null when empty so that the component is "controlled"
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
            disablePortal
          />
        ) : null}
        <Button
          type="submit"
          variant="contained"
          size="small"
          disabled={!selectedEpisode || isLoading}
          onClick={handleApply}
        >
          {isLoading ? <CircularProgress /> : 'Select'}
        </Button>
      </Stack>
    </Paper>
  )
})

AnimeSelector.displayName = 'AnimeSelector'

export const AnimeSelectorPopup = () => {
  const { isOpen } = usePopup()

  return (
    <Box
      sx={{
        position: 'absolute',
        'z-index': 9999,
        bottom: (theme) => theme.spacing(12),
        left: (theme) => theme.spacing(3),
        maxWidth: '350px',
      }}
    >
      <Slide direction="right" in={isOpen} mountOnEnter unmountOnExit>
        <AnimeSelector />
      </Slide>
    </Box>
  )
}
