import {
  DanmakuSourceType,
  type Season,
} from '@danmaku-anywhere/danmaku-converter'
import { Box, Button, Divider, Stack, Typography } from '@mui/material'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SeasonGrid } from '@/common/components/Season/SeasonGrid'
import { useToast } from '@/common/components/Toast/toastStore'
import { isNotCustom } from '@/common/danmaku/utils'
import { useLoadDanmaku } from '@/content/controller/common/hooks/useLoadDanmaku'
import { useMatchEpisode } from '@/content/controller/danmaku/integration/hooks/useMatchEpisode'
import { usePopup } from '@/content/controller/store/popupStore'
import { useStore } from '@/content/controller/store/store'

export const SelectorPage = () => {
  const { t } = useTranslation()
  const { toast } = useToast()

  const selectorBoxRef = useRef<HTMLDivElement>(undefined)
  const { animes, toggleOpen } = usePopup()
  const { mediaInfo } = useStore.use.integration()

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
    if (!selectedSeason || !mediaInfo) return

    const episodeMatchPayload = {
      mapKey: mediaInfo.getKey(),
      title: selectedSeason.title,
      episodeNumber: mediaInfo.episode,
      seasonId: selectedSeason.id,
    }

    matchEpisode.mutate(episodeMatchPayload, {
      onSuccess: (result) => {
        if (
          result.data.status !== 'success' ||
          result.data.data.provider === DanmakuSourceType.Custom // shouldn't happen here
        ) {
          return
        }
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
        </Stack>
      </Box>
    </Box>
  )
}
