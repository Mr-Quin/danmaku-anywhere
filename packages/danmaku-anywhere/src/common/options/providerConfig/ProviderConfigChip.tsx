import { Chip } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { localizedDanmakuSourceType } from '@/common/danmaku/enums'
import type { ProviderConfig } from './schema'

export const ProviderConfigChip = ({ config }: { config: ProviderConfig }) => {
  const { t } = useTranslation()

  if (config.isBuiltIn) {
    return (
      <Chip
        label={t('providers.builtin', 'Built-in')}
        size="small"
        color="primary"
      />
    )
  }
  return (
    <Chip label={t(localizedDanmakuSourceType(config.impl))} size="small" />
  )
}
