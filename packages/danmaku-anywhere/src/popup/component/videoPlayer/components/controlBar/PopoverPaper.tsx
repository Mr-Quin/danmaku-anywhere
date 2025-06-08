import { Paper, type PaperProps, styled } from '@mui/material'
import type { ReactNode } from 'react'

const StyledPaper = styled(Paper)(() => ({
  color: 'white',
  backgroundColor: 'rgba(0, 0, 0, 0.8)',
  boxShadow: '0 0 10px rgba(0, 0, 0, 0.3)',
}))

export interface PopoverPaperProps extends PaperProps {
  children: ReactNode
  maxWidth?: number | string
  maxHeight?: number | string
}

export const PopoverPaper = StyledPaper
