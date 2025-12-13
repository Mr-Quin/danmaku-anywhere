import { Accordion, styled } from '@mui/material'

export const OutlineAccordian = styled(Accordion)(({ theme }) => {
  return {
    width: '100%',
    '&:before': { display: 'none' },
    ['.MuiButtonBase-root']: {
      minHeight: '40px',
    },
    backgroundColor: 'transparent',
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
  }
})
