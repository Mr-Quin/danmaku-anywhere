import { Switch, styled } from '@mui/material'

// The default Switch thumb + track wash out against the pink AppBar background
// in both light and dark mode. Force explicit contrasting colors so the on/off
// state stays legible on `primary.main`.
export const StyledEnableSwitch = styled(Switch)(({ theme }) => {
  const onPrimary = theme.palette.primary.contrastText
  const inkOff = theme.palette.mode === 'dark' ? '#2A0F1A' : '#FFFFFF'
  const trackOff =
    theme.palette.mode === 'dark'
      ? 'rgba(42,15,26,0.45)'
      : 'rgba(255,255,255,0.55)'
  // Checked track sits over the pink `primary.main` AppBar in both modes;
  // a near-black `background.default` in dark mode reads as a broken patch,
  // so use a translucent light fill that mirrors the light-mode contrast.
  const trackOn =
    theme.palette.mode === 'dark'
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
