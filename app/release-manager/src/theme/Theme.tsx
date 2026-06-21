import CssBaseline from '@mui/material/CssBaseline'
import GlobalStyles from '@mui/material/GlobalStyles'
import { ThemeProvider } from '@mui/material/styles'
import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { createSakuraTheme } from './sakura.js'

function getPreferredMode(): 'light' | 'dark' {
  if (typeof window === 'undefined') {
    return 'dark'
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

interface ThemeProps {
  children: ReactNode
}

const globalStyles = { 'html, body, #root': { height: '100%' } }

export function Theme({ children }: ThemeProps) {
  const [mode, setMode] = useState<'light' | 'dark'>(getPreferredMode)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    function handler(e: MediaQueryListEvent) {
      setMode(e.matches ? 'dark' : 'light')
    }
    mq.addEventListener('change', handler)
    return () => {
      mq.removeEventListener('change', handler)
    }
  }, [])

  const theme = useMemo(() => createSakuraTheme(mode), [mode])

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <GlobalStyles styles={globalStyles} />
      {children}
    </ThemeProvider>
  )
}
