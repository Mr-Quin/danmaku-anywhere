import type {
  DanDanAnime,
  DanDanEpisode,
} from '@danmaku-anywhere/danmaku-provider/ddp'
import { Check } from '@mui/icons-material'
import { LoadingButton } from '@mui/lab'
import {
  Autocomplete,
  Box,
  Checkbox,
  Divider,
  FormControl,
  FormControlLabel,
  FormHelperText,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { usePopup } from '../../../store/popupStore'
import { useStore } from '../../../store/store'

import { MediaTypeIcon } from '@/common/components/MediaList/components/MediaTypeIcon'
import { DanmakuSourceType, hasIntegration } from '@/common/danmaku/enums'
import { useFetchDanmakuMapped } from '@/content/common/hooks/useFetchDanmakuMapped'

export const SelectorPanel = () => {
  const { t } = useTranslation()
  const selectorBoxRef = useRef<HTMLDivElement>()
  const { animes, saveMapping, setSaveMapping, toggleOpen } = usePopup()
  const mediaInfo = useStore((state) => state.mediaInfo)
  const integration = useStore((state) => state.integration)

  const [selectedAnime, setSelectedAnime] = useState<DanDanAnime>()
  const [selectedEpisode, setSelectedEpisode] = useState<DanDanEpisode>()

  const episodes = selectedAnime?.episodes ?? []

  const { fetch, isPending } = useFetchDanmakuMapped()

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
      mediaInfo && saveMapping && !hasIntegration(integration)
        ? {
            originalTitle: mediaInfo.toTitleString(),
            title: selectedAnime.animeTitle,
            animeId: selectedAnime.animeId,
            integration,
          }
        : undefined
    await fetch({
      danmakuMeta: {
        type: DanmakuSourceType.DDP,
        animeId: selectedAnime.animeId,
        animeTitle: selectedAnime.animeTitle,
        ...selectedEpisode,
      },
      titleMapping,
    })

    toggleOpen(false)
  }

  if (animes.length === 0) {
    return (
      <Box p={2}>
        <Typography variant="h6">{t('selectorPage.noAnimeFound')}</Typography>
      </Box>
    )
  }

  return (
    <Box flexGrow={1}>
      <Typography variant="body1" p={2}>
        {t('selectorPage.selectAnime', { name: mediaInfo?.toTitleString() })}
      </Typography>
      <List disablePadding dense>
        {animes.map((anime) => {
          return (
            <ListItemButton
              onClick={() => handleAnimeSelect(anime)}
              key={anime.animeId}
            >
              <MediaTypeIcon
                icon={anime.type}
                description={anime.typeDescription}
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
                return <TextField {...params} label={t('anime.episode')} />
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
            {t('common.apply')}
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
              label={t('selectorPage.saveMapping')}
            />
            {selectedAnime && (
              <FormHelperText>
                {t('selectorPage.saveMappingAs', {
                  originalName: mediaInfo?.toTitleString(),
                  newName: selectedAnime.animeTitle,
                })}
              </FormHelperText>
            )}
          </FormControl>
        </Stack>
      </Box>
    </Box>
  )
}
