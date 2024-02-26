import type { ThemeOptions } from '@mui/material/styles'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import type { PropsWithChildren } from 'react'

export const themeOptions: ThemeOptions = {
  palette: {
    mode: 'dark',
  },
}

const theme = createTheme(themeOptions)

export const Theme = ({ children }: PropsWithChildren) => {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>
}
