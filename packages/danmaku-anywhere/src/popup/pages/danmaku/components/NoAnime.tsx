import { Box, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'

import { useStore } from '@/popup/store'

export const NoAnime = () => {
  const { t } = useTranslation()
  const { animeFilter } = useStore.use.danmaku()

  if (animeFilter)
    return (
      <Box p={2}>
        <Typography>
          {t('danmakuPage.noResult', { filter: animeFilter })}
        </Typography>
      </Box>
    )

  return (
    <Box p={2}>
      <Typography>{t('danmakuPage.noAnime')}</Typography>
    </Box>
  )
}
