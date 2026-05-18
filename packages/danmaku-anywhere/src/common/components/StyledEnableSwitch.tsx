import { alpha, Switch, styled } from '@mui/material'

export const StyledEnableSwitch = styled(Switch)(({ theme }) => {
  const isDark = theme.palette.mode === 'dark'
  const onPrimary = theme.palette.primary.contrastText
  const trackOff = alpha(onPrimary, isDark ? 0.45 : 0.55)
  const trackOn = isDark
    ? alpha('#FFFFFF', 0.55)
    : theme.palette.background.default

  return {
    '&.MuiSwitch-root .MuiSwitch-track': {
      backgroundColor: trackOff,
      opacity: 1,
    },
    '&.MuiSwitch-root .MuiSwitch-thumb': {
      color: onPrimary,
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
