import { SeasonGrid } from '@/common/components/MediaList/components/SeasonGrid'
import { isNotCustom } from '@/common/danmaku/utils'
import type { Season } from '@danmaku-anywhere/danmaku-converter'
import CloseIcon from '@mui/icons-material/Close'
import { Box, IconButton, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'

interface DisambiguationSelectorProps {
  seasons: Season[]
  title: string
  onApply: (season: Season) => void
  onClose?: () => void
  isLoading?: boolean
}

export const DisambiguationSelector = ({
  seasons,
  title,
  onApply,
  onClose,
}: DisambiguationSelectorProps) => {
  const { t } = useTranslation()

  if (seasons.length === 0) {
    return (
      <Box p={2}>
        <Typography variant="h6">{t('selectorPage.noAnimeFound')}</Typography>
      </Box>
    )
  }

  return (
    <Box p={2} height={1}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Typography variant="body1">
          {t('selectorPage.selectAnime', { name: title })}
        </Typography>
        {onClose && (
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        )}
      </Stack>
      <SeasonGrid
        data={seasons}
        onSeasonClick={(season) => {
          if (isNotCustom(season)) {
            onApply(season)
          }
        }}
        disableMenu
      />
    </Box>
  )
}
