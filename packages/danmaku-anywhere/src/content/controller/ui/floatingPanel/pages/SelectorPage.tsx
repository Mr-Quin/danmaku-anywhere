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

import { SeasonV1 } from '@/common/anime/types/v1/schema'
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

  const [selectedSeason, setSelectedSeason] = useState<SeasonV1>()

  const { loadMutation } = useLoadDanmaku()

  const matchEpisode = useMatchEpisode()

  const handleAnimeSelect = (anime: SeasonV1) => {
    setSelectedSeason(anime)
    selectorBoxRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
    })
  }

  const handleApply = async () => {
    if (!selectedSeason || !mediaInfo) return

    const episodeMatchPayload = {
      mapKey: mediaInfo.fullSeason(),
      title: selectedSeason.title,
      episodeNumber: mediaInfo.episode,
      seasonId: selectedSeason.indexedId,
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
        {t('selectorPage.selectAnime', { name: mediaInfo?.fullSeason() })}
      </Typography>
      <List disablePadding dense>
        {animes.map((season) => {
          return (
            <ListItemButton
              onClick={() => handleAnimeSelect(season)}
              key={season.id}
            >
              <MediaTypeIcon
                icon={getDanDanPlayMediaIcon(season.type)}
                description={season.type}
              />
              <ListItemText primary={season.title} />
              {season === selectedSeason && <Check />}
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
            disabled={!selectedSeason || loadMutation.isPending}
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
                  disabled={!selectedSeason}
                />
              }
              label={t('selectorPage.saveMapping')}
            />
            {selectedSeason && (
              <FormHelperText>
                {t('selectorPage.saveMappingAs', {
                  originalName: mediaInfo?.fullSeason(),
                  newName: selectedSeason.title,
                })}
              </FormHelperText>
            )}
          </FormControl>
        </Stack>
      </Box>
    </Box>
  )
}
