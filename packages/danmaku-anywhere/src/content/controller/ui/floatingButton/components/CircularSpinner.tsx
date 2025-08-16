import { keyframes, styled } from '@mui/material'

const spinAnimation = keyframes`
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
`

const SpinnerContainer = styled('div')(({ theme }) => ({
  position: 'absolute',
  top: -4,
  left: -4,
  width: 48, // 40px FAB + 8px margin
  height: 48,
  borderRadius: '50%',
  border: `2px solid transparent`,
  borderTop: `2px solid ${theme.palette.primary.main}`,
  animation: `${spinAnimation} 1s linear infinite`,
  pointerEvents: 'none',
}))

interface CircularSpinnerProps {
  isLoading: boolean
}

export const CircularSpinner = ({ isLoading }: CircularSpinnerProps) => {
  if (!isLoading) return null
  
  return <SpinnerContainer />
}