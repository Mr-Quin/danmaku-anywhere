import { CheckBox, CheckBoxOutlined } from '@mui/icons-material'
import { Chip, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'

interface MultiselectChipProps {
  active: boolean
  onToggle: () => void
}

export const MultiselectChip = ({ active, onToggle }: MultiselectChipProps) => {
  const { t } = useTranslation()

  return (
    <Chip
      variant="outlined"
      label={
        <Stack direction="row" alignItems="center" gap={0.5}>
          {active ? (
            <CheckBox fontSize="small" />
          ) : (
            <CheckBoxOutlined fontSize="small" />
          )}
          <Typography variant="body2" fontSize="small">
            {t('common.multiselect', 'Multiselect')}
          </Typography>
        </Stack>
      }
      onClick={onToggle}
      color="primary"
    />
  )
}
