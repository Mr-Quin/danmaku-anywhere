import { Chip } from '@mui/material'
import { useTranslation } from 'react-i18next'

import { DanmakuSourceType } from '@/common/danmaku/enums'

export const DanmakuProviderChip = ({
  provider,
}: {
  provider: DanmakuSourceType
}) => {
  const { t } = useTranslation()
  return (
    <Chip
      label={t(`danmaku.type.${DanmakuSourceType[provider]}`)}
      size="small"
    />
  )
}
