import { useMediaQuery } from '@mui/material'

export const useIsPortrait = () => {
  return useMediaQuery('(orientation: portrait)')
}
