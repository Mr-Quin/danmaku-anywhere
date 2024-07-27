import { Button, styled } from '@mui/material'
import type { ReactNode } from 'react'

interface ThemeButtonProps {
  label: string
  icon: ReactNode
  selected: boolean
  onClick: () => void
}

const StyledButton = styled(Button)<{ selected: boolean }>(({
  theme,
  selected,
}) => {
  if (selected) {
    return {
      display: 'flex',
      gap: theme.spacing(1),
      color: theme.palette.primary.contrastText,
      backgroundColor: theme.palette.primary.main,
      '&:hover': {
        backgroundColor: theme.palette.primary.dark,
      },
    }
  }
  return {
    display: 'flex',
    gap: theme.spacing(1),
    color: theme.palette.text.primary,
    backgroundColor: theme.palette.background.paper,
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
  }
})

export const ThemeButton = ({
  icon,
  label,
  selected,
  onClick,
}: ThemeButtonProps) => {
  return (
    <StyledButton onClick={onClick} selected={selected}>
      {icon}
      {label}
    </StyledButton>
  )
}
