import { SeasonGrid } from '@/common/components/MediaList/components/SeasonGrid'
import { isNotCustom } from '@/common/danmaku/utils'
import type { Season } from '@danmaku-anywhere/danmaku-converter'
import { Box, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'

interface DisambiguationSelectorProps {
  seasons: Season[]
  title: string
  onApply: (season: Season) => void
  isLoading?: boolean
}

export const DisambiguationSelector = ({
  seasons,
  title,
  onApply,
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
      <Typography variant="body1">
        {t('selectorPage.selectAnime', { name: title })}
      </Typography>
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
