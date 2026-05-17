import { Switch, styled } from '@mui/material'

export const StyledEnableSwitch = styled(Switch)(({ theme }) => {
  const isDark = theme.palette.mode === 'dark'
  const onPrimary = theme.palette.primary.contrastText
  const inkOff = isDark ? '#2A0F1A' : '#FFFFFF'
  const trackOff = isDark ? 'rgba(42,15,26,0.45)' : 'rgba(255,255,255,0.55)'
  const trackOn = isDark
    ? 'rgba(255,255,255,0.55)'
    : theme.palette.background.default

  return {
    '&.MuiSwitch-root .MuiSwitch-track': {
      backgroundColor: trackOff,
      opacity: 1,
    },
    '&.MuiSwitch-root .MuiSwitch-thumb': {
      color: inkOff,
    },
    '&.MuiSwitch-root .MuiSwitch-switchBase.Mui-checked': {
      '& .MuiSwitch-thumb': {
        color: onPrimary,
      },
      '+ .MuiSwitch-track': {
        backgroundColor: trackOn,
        opacity: 1,
      },
    },
  }
})
