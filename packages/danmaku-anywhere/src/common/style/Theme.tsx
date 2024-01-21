import { createTheme, ThemeOptions, ThemeProvider } from '@mui/material/styles'
import { PropsWithChildren } from 'react'

export const themeOptions: ThemeOptions = {
  palette: {
    mode: 'dark',
  },
}

const theme = createTheme(themeOptions)

export const Theme = ({ children }: PropsWithChildren) => {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>
}
