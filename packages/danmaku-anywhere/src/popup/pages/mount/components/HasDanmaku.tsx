import { Box, Typography } from '@mui/material'
import type { PropsWithChildren } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { useAllDanmakuSuspense } from '@/common/danmaku/queries/useAllDanmakuSuspense'

export const HasDanmaku = ({ children }: PropsWithChildren) => {
  const { data } = useAllDanmakuSuspense()
  const { t } = useTranslation()

  if (data.length === 0) {
    return (
      <Box p={2}>
        <Typography>{t('mountPage.noDanmaku')}</Typography>
        <Box mt={2}>
          <Typography color="primary" to="/search" component={Link}>
            {t('mountPage.noDanmakuHelp')}
          </Typography>
        </Box>
      </Box>
    )
  }

  return children
}
