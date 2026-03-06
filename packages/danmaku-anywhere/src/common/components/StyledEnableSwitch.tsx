import { Switch, styled } from '@mui/material'

// Uses theme's primary color for checked state in both light and dark mode
export const StyledEnableSwitch = styled(Switch)(({ theme }) => ({
  '&.MuiSwitch-root': {
    '& .MuiSwitch-switchBase.Mui-checked': {
      '& .MuiSwitch-thumb': {
        color: theme.palette.primary.main,
      },
      '+ .MuiSwitch-track': {
        backgroundColor: theme.palette.primary.light,
        opacity: 0.5,
      },
    },
  },
}))
