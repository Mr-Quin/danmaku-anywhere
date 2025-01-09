import { useMediaQuery } from '@mui/material'

export const useIsTouchDevice = () => {
  return useMediaQuery('(pointer: coarse)')
}
