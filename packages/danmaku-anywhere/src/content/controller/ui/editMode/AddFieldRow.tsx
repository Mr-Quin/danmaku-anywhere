import { Add } from '@mui/icons-material'
import { Box, ButtonBase, Stack, Typography, useTheme } from '@mui/material'
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
      spacing={0.625}
      sx={{ alignItems: 'center', flexWrap: 'wrap' }}
    >
      <Typography variant="overline" sx={{ color: 'text.secondary', mr: 0.25 }}>
        {t('editMode.addField.label', '+ Add')}
      </Typography>
      {available.map((id) => {
        const color = theme.palette.fieldAccent[id]
        return (
          <ButtonBase
            key={id}
            onClick={() => onPick(id)}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              px: 0.875,
              py: 0.25,
              borderRadius: 999,
              border: `1px solid ${color}66`,
              color,
              fontSize: 11,
              fontWeight: 600,
              fontFamily: 'inherit',
              cursor: 'pointer',
              '&:hover': {
                background: `${color}14`,
              },
            }}
          >
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: color,
              }}
            />
            {getFieldLabel(t, id)}
            <Add sx={{ fontSize: 11 }} />
          </ButtonBase>
        )
      })}
    </Stack>
  )
}
