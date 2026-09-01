import { Add } from '@mui/icons-material'
import { Chip, Stack, Typography, useTheme } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { FieldId } from './fields'
import { getFieldLabel } from './fields'

interface AddFieldRowProps {
  available: readonly FieldId[]
  onPick: (fieldId: FieldId) => void
}

export function AddFieldRow({ available, onPick }: AddFieldRowProps) {
  const { t } = useTranslation()
  const theme = useTheme()

  if (available.length === 0) {
    return null
  }

  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 1 }}
    >
      <Typography variant="overline" sx={{ color: 'text.secondary' }}>
        {t('editMode.addField.label', '+ Add')}
      </Typography>
      {available.map((id) => {
        const color = theme.palette.fieldAccent[id]
        return (
          <Chip
            key={id}
            size="small"
            clickable
            variant="outlined"
            onClick={() => onPick(id)}
            label={getFieldLabel(t, id)}
            icon={<Add />}
            sx={{
              borderColor: `${color}66`,
              color,
              '& .MuiChip-icon': { color },
              '&:hover': { background: `${color}14` },
            }}
          />
        )
      })}
    </Stack>
  )
}
