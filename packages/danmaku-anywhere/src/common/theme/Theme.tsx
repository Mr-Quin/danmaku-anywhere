import { useMediaQuery } from '@mui/material'
import type { ThemeOptions } from '@mui/material/styles'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { produce } from 'immer'
import { type PropsWithChildren, createContext, use, useMemo } from 'react'

import { tryCatchSync } from '../utils/utils'

import type { UserTheme } from '@/common/options/extensionOptions/schema'
import { useExtensionOptions } from '@/common/options/extensionOptions/useExtensionOptions'
import { ColorMode } from '@/common/theme/enums'

const defaultThemeOptions: ThemeOptions = {
  palette: {
    mode: 'dark',
  },
}

type ThemeContext = UserTheme & {
  setColorMode: (colorScheme: ColorMode) => void
}

const context = createContext<ThemeContext>({
  colorMode: ColorMode.System,
  setColorMode: () => void 0,
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

  const { data, partialUpdate } = useExtensionOptions()
  const colorMode = data.theme.colorMode

  const setColorMode = async (colorScheme: ColorMode) => {
    await partialUpdate(
      produce(data, (draft) => {
        draft.theme.colorMode = colorScheme
      })
    )
  }

  const theme = useMemo(() => {
    const preferredColorScheme = (prefersDarkMode ?? true) ? 'dark' : 'light'

    return createTheme(
      produce(defaultThemeOptions, (draft) => {
        Object.assign(draft, options)
        if (!draft.palette) draft.palette = {}
        draft.palette.mode =
          colorMode === 'system' ? preferredColorScheme : colorMode
      })
    )
  }, [colorMode, options])

  const themeContextValue = useMemo(
    () => ({
      colorMode,
      setColorMode,
    }),
    [colorMode, setColorMode]
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
