import { Add } from '@mui/icons-material'
import { Box, ButtonBase, useTheme } from '@mui/material'
import { useTranslation } from 'react-i18next'

interface RequiredFieldEmptyProps {
  fieldLabel: string
  onClick: () => void
}

export function RequiredFieldEmpty({
  fieldLabel,
  onClick,
}: RequiredFieldEmptyProps) {
  const { t } = useTranslation()
  const theme = useTheme()
  const color = theme.palette.fieldAccent.title

  return (
    <ButtonBase
      onClick={onClick}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.875,
        px: 1.125,
        py: 0.875,
        borderRadius: 1,
        background: 'transparent',
        border: `1px dashed ${color}73`,
        color,
        fontSize: 12,
        fontWeight: 600,
        width: '100%',
        textAlign: 'left',
        fontFamily: 'inherit',
        cursor: 'pointer',
        '&:hover': {
          background: `${color}14`,
        },
      }}
    >
      <Box
        sx={{
          width: 16,
          height: 16,
          borderRadius: '3px',
          border: `1.5px dashed ${color}`,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Add sx={{ fontSize: 10 }} />
      </Box>
      <Box sx={{ flexGrow: 1 }}>
        {t('editMode.empty.pickField', 'Pick {{label}}', {
          label: fieldLabel.toLowerCase(),
        })}
      </Box>
      <Box
        component="span"
        sx={{
          fontSize: 9,
          px: 0.5,
          borderRadius: '3px',
          background: `${color}30`,
          fontWeight: 700,
          letterSpacing: 0.3,
        }}
      >
        {t('editMode.empty.required', 'REQ')}
      </Box>
    </ButtonBase>
  )
}
