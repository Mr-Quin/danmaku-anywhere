import { useMediaQuery } from '@mui/material'
import type { ThemeOptions } from '@mui/material/styles'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import type { Localization } from '@mui/x-data-grid/internals'
import { enUS, zhCN } from '@mui/x-data-grid/locales'
import { produce } from 'immer'
import { createContext, type PropsWithChildren, use, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { UserTheme } from '@/common/options/extensionOptions/schema'
import { useExtensionOptions } from '@/common/options/extensionOptions/useExtensionOptions'
import { ColorMode } from '@/common/theme/enums'
import { tryCatchSync } from '../utils/utils'

const defaultThemeOptions: ThemeOptions = {
  palette: {
    mode: 'dark',
  },
}

type ThemeContext = UserTheme & {
  setColorMode: (colorScheme: ColorMode) => void
  colorScheme: 'dark' | 'light'
}

const context = createContext<ThemeContext>({
  colorMode: ColorMode.System,
  colorScheme: 'dark',
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

  const { i18n } = useTranslation()

  const { data, partialUpdate } = useExtensionOptions()

  const setColorMode = async (colorScheme: ColorMode) => {
    await partialUpdate(
      produce(data, (draft) => {
        draft.theme.colorMode = colorScheme
      })
    )
  }

  const colorMode = data.theme.colorMode
  const preferredColorScheme = (prefersDarkMode ?? true) ? 'dark' : 'light'
  const colorScheme: 'dark' | 'light' =
    colorMode === 'system' ? preferredColorScheme : colorMode

  const theme = useMemo(() => {
    const languageMap: Record<string, Localization> = {
      zh: zhCN,
      en: enUS,
    }

    return createTheme(
      produce(defaultThemeOptions, (draft) => {
        Object.assign(draft, options)
        if (!draft.palette) draft.palette = {}
        draft.palette.mode = colorScheme
      }),
      languageMap[i18n.language]
    )
  }, [colorScheme, options, i18n.language])

  const themeContextValue = useMemo(
    () => ({
      colorMode,
      colorScheme,
      setColorMode,
    }),
    [colorScheme, colorMode, setColorMode]
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
