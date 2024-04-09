import { styled } from '@mui/material'

export const FloatingPanelLayout = styled('div')(
  () => `
  display: flex;
  flex-direction: column;
  height: 400px;
  max-height: 400px;
  max-width: 350px;
  min-width: 350px;
  overflow: hidden;
`
)
