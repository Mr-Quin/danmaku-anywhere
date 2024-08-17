import { Chip } from '@mui/material'
import { useTranslation } from 'react-i18next'

import type { DanmakuSourceType } from '@/common/danmaku/enums'
import { localizedDanmakuSourceType } from '@/common/danmaku/enums'

export const DanmakuProviderChip = ({
  provider,
}: {
  provider: DanmakuSourceType
}) => {
  const { t } = useTranslation()
  return <Chip label={t(localizedDanmakuSourceType(provider))} size="small" />
}
