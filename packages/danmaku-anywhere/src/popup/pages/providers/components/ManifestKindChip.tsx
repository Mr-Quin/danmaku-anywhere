import { Chip } from '@mui/material'
import { useTranslation } from 'react-i18next'

interface ManifestKindChipProps {
  kind?: 'preinstalled' | 'user'
}

export const ManifestKindChip = ({ kind }: ManifestKindChipProps) => {
  const { t } = useTranslation()
  if (kind !== 'user') {
    return null
  }
  return (
    <Chip
      size="small"
      variant="outlined"
      label={t('providers.installed.custom', 'Custom')}
      sx={{ height: 18, '& .MuiChip-label': { px: 0.75 } }}
    />
  )
}
