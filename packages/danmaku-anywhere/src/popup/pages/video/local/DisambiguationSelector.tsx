import { SeasonGrid } from '@/common/components/MediaList/components/SeasonGrid'
import { useToast } from '@/common/components/Toast/toastStore'
import { useMatchEpisode } from '@/common/danmaku/queries/useMatchEpisode'
import { isNotCustom } from '@/common/danmaku/utils'
import { useLoadDanmaku } from '@/content/controller/common/hooks/useLoadDanmaku'
import { usePopup } from '@/content/controller/store/popupStore'
import { useStore } from '@/content/controller/store/store'
import type { Season } from '@danmaku-anywhere/danmaku-converter'
import {
  Box,
  Button,
  Checkbox,
  Divider,
  FormControl,
  FormControlLabel,
  Stack,
  Typography,
} from '@mui/material'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

export const DisambiguationSelector = () => {
  const { t } = useTranslation()
  const { toast } = useToast()

  const selectorBoxRef = useRef<HTMLDivElement>(undefined)

  const [selectedSeason, setSelectedSeason] = useState<Season>()

  const { loadMutation } = useLoadDanmaku()

  const matchEpisode = useMatchEpisode()

  const handleAnimeSelect = (anime: Season) => {
    setSelectedSeason(anime)
    selectorBoxRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
    })
  }

  const handleApply = async () => {
    if (!selectedSeason) return

    const episodeMatchPayload = {
      title: selectedSeason.title,
      seasonId: selectedSeason.id,
    }

    matchEpisode.mutate(episodeMatchPayload, {
      onSuccess: (result) => {
        switch (result.data.status) {
          case 'success': {
            loadMutation.mutate(
              {
                meta: result.data.data,
                options: {
                  forceUpdate: false,
                },
              },
              {
                onSettled: () => {
                  toggleOpen()
                },
                onError: () => {
                  toast.error(
                    t('danmaku.alert.fetchError', {
                      message: selectedSeason.title,
                    })
                  )
                },
              }
            )
            break
          }
        }
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
      <Box p={2}>
        <Typography variant="body1">
          {t('selectorPage.selectAnime', { name: mediaInfo?.toString() })}
        </Typography>
        <SeasonGrid
          data={animes}
          onSelectionChange={([season]) => {
            if (isNotCustom(season)) {
              handleAnimeSelect(season)
            }
          }}
          disableMenu
          enableSelection
          singleSelect
        />
      </Box>
      <Divider />

      <Box my={2} px={2} ref={selectorBoxRef}>
        <Stack direction="column" alignItems="flex-start" spacing={2}>
          <Button
            type="submit"
            loading={loadMutation.isPending || matchEpisode.isPending}
            variant="contained"
            size="small"
            onClick={handleApply}
            disabled={!selectedSeason}
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
          </FormControl>
        </Stack>
      </Box>
    </Box>
  )
}
