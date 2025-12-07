import { Divider, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'

import { useStore } from '@/content/controller/store/store'

export const EpisodeInfo = () => {
  const { t } = useTranslation()
  const { mediaInfo, errorMessage } = useStore.use.integration()

  if (!mediaInfo && !errorMessage) {
    return null
  }

  return (
    <>
      <Divider sx={{ mt: 2, mb: 2 }} />
      {mediaInfo && (
        <>
          <Typography variant="body2">
            {t('anime.title', 'Title')}: {mediaInfo.seasonTitle}
          </Typography>
          <Typography variant="body2">
            {t('anime.season', 'Season')}: {mediaInfo.seasonDecorator ?? 'NULL'}
          </Typography>
          <Typography variant="body2">
            {t('anime.episode', 'Episode')}: {mediaInfo.episode}
          </Typography>
          <Typography variant="body2">
            {t('anime.episodeTitle', 'Episode Title')}:{' '}
            {mediaInfo.episodeTitle ?? 'NULL'}
          </Typography>
        </>
      )}
      {errorMessage && (
        <>
          <Typography color="error">{errorMessage}</Typography>
        </>
      )}
    </>
  )
}
