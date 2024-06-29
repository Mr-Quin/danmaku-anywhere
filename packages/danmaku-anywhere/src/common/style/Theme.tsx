import { useMediaQuery } from '@mui/material'
import type { ThemeOptions } from '@mui/material/styles'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import {
  createContext,
  type PropsWithChildren,
  use,
  useMemo,
  useState,
} from 'react'

import { tryCatchSync } from '../utils/utils'

const defaultThemeOptions: ThemeOptions = {
  palette: {
    mode: 'dark',
  },
}

type ColorScheme = 'dark' | 'light' | 'system'

interface ThemeContext {
  colorScheme: ColorScheme
  setColorScheme: (colorScheme: ColorScheme) => void
}

const context = createContext<ThemeContext>({
  colorScheme: 'system',
  setColorScheme: () => void 0,
})

interface ThemeProps extends PropsWithChildren {
  options?: ThemeOptions
}

export const Theme = ({ children, options = {} }: ThemeProps) => {
  // TODO: for some reason, useMediaQuery crashes in Firefox so we wrap it in a try-catch
  // probably for the same reason as https://github.com/facebook/react/issues/16606
  const [prefersDarkMode] = tryCatchSync(() =>
    useMediaQuery('(prefers-color-scheme: dark)')
  )

  const [colorScheme, setColorScheme] = useState<ColorScheme>('system')

  const theme = useMemo(
    () =>
      createTheme({
        ...defaultThemeOptions,
        ...options,
        palette: {
          ...defaultThemeOptions.palette,
          ...options.palette,
          mode:
            colorScheme === 'system'
              ? prefersDarkMode ?? true
                ? 'dark'
                : 'light'
              : colorScheme,
        },
      }),
    [colorScheme, options]
  )

  const themeContextValue = useMemo(
    () => ({
      colorScheme,
      setColorScheme,
    }),
    [colorScheme, setColorScheme]
  )

  return (
    <context.Provider value={themeContextValue}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </context.Provider>
  )
}

export const useThemeContext = () => {
  return use(context)
}
