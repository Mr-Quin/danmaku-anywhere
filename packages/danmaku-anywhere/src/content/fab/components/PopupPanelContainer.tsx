import { styled } from '@mui/material'

export const PopupPanelContainer = styled('div')(
  ({ theme }) => `
  display: flex;
  flex-direction: column;
  bottom: ${theme.spacing(6)};
  left: ${theme.spacing(0)};
  height: 400px;
  max-height: 400px;
  max-width: 350px;
  min-width: 350px;
  position: absolute;
  overflow: hidden;
`
)
