import { useMediaQuery } from '@mui/material'
import type { ThemeOptions } from '@mui/material/styles'
import { ThemeProvider } from '@mui/material/styles'
import type { Localization } from '@mui/x-data-grid/internals'
import { enUS, zhCN } from '@mui/x-data-grid/locales'
import { produce } from 'immer'
import { createContext, type PropsWithChildren, use, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { UserTheme } from '@/common/options/extensionOptions/schema'
import { useExtensionOptions } from '@/common/options/extensionOptions/useExtensionOptions'
import { ColorMode } from '@/common/theme/enums'
import { createSakuraTheme } from '@/common/theme/sakura'

import { tryCatchSync } from '@/common/utils/tryCatch'

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

function usePreferredColorScheme(): 'dark' | 'light' {
  // TODO: for some reason, useMediaQuery crashes in Firefox so we wrap it in a try-catch
  // probably for the same reason as https://github.com/facebook/react/issues/16606
  const [prefersDarkMode] = tryCatchSync(() =>
    useMediaQuery('(prefers-color-scheme: dark)')
  )
  return (prefersDarkMode ?? true) ? 'dark' : 'light'
}

function useSakuraTheme(colorScheme: 'dark' | 'light', options: ThemeOptions) {
  const { i18n } = useTranslation()

  return useMemo(() => {
    const languageMap: Record<string, Localization> = {
      zh: zhCN,
      en: enUS,
    }
    return createSakuraTheme(colorScheme, options, languageMap[i18n.language])
  }, [colorScheme, options, i18n.language])
}

export const Theme = ({ children, options = {} }: ThemeProps) => {
  const preferredColorScheme = usePreferredColorScheme()

  const { data, partialUpdate } = useExtensionOptions()

  const setColorMode = async (colorScheme: ColorMode) => {
    await partialUpdate(
      produce(data, (draft) => {
        draft.theme.colorMode = colorScheme
      })
    )
  }

  const colorMode = data.theme.colorMode
  const colorScheme: 'dark' | 'light' =
    colorMode === 'system' ? preferredColorScheme : colorMode

  const theme = useSakuraTheme(colorScheme, options)

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

// For screens shown before the extension options can be read, so the user's
// own color mode is not known yet.
export const SystemTheme = ({ children, options = {} }: ThemeProps) => {
  const theme = useSakuraTheme(usePreferredColorScheme(), options)

  return <ThemeProvider theme={theme}>{children}</ThemeProvider>
}

export const useThemeContext = () => {
  return use(context)
}
