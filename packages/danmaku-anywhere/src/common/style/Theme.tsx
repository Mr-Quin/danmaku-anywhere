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
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)')

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
              ? prefersDarkMode
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
