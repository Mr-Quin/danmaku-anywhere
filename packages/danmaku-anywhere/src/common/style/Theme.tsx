import { createTheme, ThemeProvider } from '@mui/material/styles'
import { PropsWithChildren } from 'react'

const theme = createTheme({
  palette: {
    mode: 'dark',
  },
})

export const Theme = ({ children }: PropsWithChildren) => {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>
}
