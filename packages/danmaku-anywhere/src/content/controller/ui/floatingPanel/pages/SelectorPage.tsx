import type { SearchAnimeDetails } from '@danmaku-anywhere/danmaku-provider/ddp'
import { Check } from '@mui/icons-material'
import {
  Box,
  Button,
  Checkbox,
  Divider,
  FormControl,
  FormControlLabel,
  FormHelperText,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { MediaTypeIcon } from '@/common/components/MediaList/components/MediaTypeIcon'
import { getDanDanPlayMediaIcon } from '@/common/components/MediaList/components/makeIcon'
import { useLoadDanmaku } from '@/content/controller/common/hooks/useLoadDanmaku'
import { useMatchEpisode } from '@/content/controller/danmaku/integration/hooks/useMatchEpisode'
import { usePopup } from '@/content/controller/store/popupStore'
import { useStore } from '@/content/controller/store/store'

export const SelectorPage = () => {
  const { t } = useTranslation()
  const selectorBoxRef = useRef<HTMLDivElement>(undefined)
  const { animes, saveMapping, setSaveMapping, toggleOpen } = usePopup()
  const { mediaInfo } = useStore.use.integration()

  const [selectedAnime, setSelectedAnime] = useState<SearchAnimeDetails>()

  const { loadMutation } = useLoadDanmaku()

  const matchEpisode = useMatchEpisode()

  const handleAnimeSelect = (anime: SearchAnimeDetails) => {
    setSelectedAnime(anime)
    selectorBoxRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
    })
  }

  const handleApply = async () => {
    if (!selectedAnime || !mediaInfo) return

    const episodeMatchPayload = {
      mapKey: mediaInfo.key(),
      title: selectedAnime.animeTitle,
      episodeNumber: mediaInfo.episode,
      seasonId: selectedAnime.animeId,
    }

    matchEpisode.mutate(episodeMatchPayload, {
      onSettled: () => {
        // delay closing the popup so that mutation lifecycle hooks can run
        setTimeout(() => {
          toggleOpen()
        }, 1000)
      },
    })
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
        {t('selectorPage.selectAnime', { name: mediaInfo?.key() })}
      </Typography>
      <List disablePadding dense>
        {animes.map((anime) => {
          return (
            <ListItemButton
              onClick={() => handleAnimeSelect(anime)}
              key={anime.animeId}
            >
              <MediaTypeIcon
                icon={getDanDanPlayMediaIcon(anime.type)}
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
          <Button
            type="submit"
            loading={loadMutation.isPending}
            variant="contained"
            size="small"
            onClick={handleApply}
            disabled={!selectedAnime || loadMutation.isPending}
          >
            {t('common.apply')}
          </Button>
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
                  originalName: mediaInfo?.key(),
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
