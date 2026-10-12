import { CheckBox, CheckBoxOutlined } from '@mui/icons-material'
import { Chip, Stack, Tooltip, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { NARROW_CONTAINER_QUERY } from '@/common/components/layout/narrowContainer'

interface MultiselectChipProps {
  active: boolean
  onToggle: () => void
}

export const MultiselectChip = ({ active, onToggle }: MultiselectChipProps) => {
  const { t } = useTranslation()
  const label = t('common.multiselect', 'Multiselect')

  return (
    <Tooltip title={label}>
      <Chip
        variant="outlined"
        data-testid="multiselect-toggle"
        aria-label={label}
        label={
          <Stack
            direction="row"
            sx={{
              alignItems: 'center',
              gap: 0.5,
            }}
          >
            {active ? (
              <CheckBox fontSize="small" />
            ) : (
              <CheckBoxOutlined fontSize="small" />
            )}
            <Typography
              variant="body2"
              sx={{
                fontSize: 'small',
                whiteSpace: 'nowrap',
                [NARROW_CONTAINER_QUERY]: { display: 'none' },
              }}
            >
              {label}
            </Typography>
          </Stack>
        }
        onClick={onToggle}
        color="primary"
        sx={{ flexShrink: 0 }}
      />
    </Tooltip>
  )
}
