import { Switch, styled } from '@mui/material'

// The thumb and track color of the switch are invisible in light mode, so we need to set the color
export const StyledEnableSwitch = styled(Switch)(({ theme }) => {
  if (theme.palette.mode === 'dark') return {}

  return {
    '&.MuiSwitch-root': {
      '& .MuiSwitch-switchBase.Mui-checked': {
        '& .MuiSwitch-thumb': {
          color: theme.palette.primary.light,
        },
        '+ .MuiSwitch-track': {
          backgroundColor: theme.palette.background.default,
        },
      },
    },
  }
})
