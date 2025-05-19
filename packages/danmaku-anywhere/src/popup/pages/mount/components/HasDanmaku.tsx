import { Box, Typography } from '@mui/material'
import type { PropsWithChildren } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { NothingHere } from '@/common/components/NothingHere'

import { useAllDanmakuSuspense } from '@/common/danmaku/queries/useDanmakuMany'

export const HasDanmaku = ({ children }: PropsWithChildren) => {
  const { data } = useAllDanmakuSuspense()
  const { t } = useTranslation()

  if (data.length === 0) {
    return (
      <Box flexGrow={1}>
        <NothingHere message={t('mountPage.noDanmaku')}>
          <Box mt={2}>
            <Typography color="primary" to="/search" component={Link}>
              {t('mountPage.noDanmakuHelp')}
            </Typography>
          </Box>
        </NothingHere>
      </Box>
    )
  }

  return children
}
