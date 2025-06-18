import createCache from '@emotion/cache'
import { CacheProvider } from '@emotion/react'
import type { ThemeOptions } from '@mui/material'
import { QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { Logger } from '@/common/Logger'
import { queryClient } from '@/common/queries/queryClient'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { Theme } from '@/common/theme/Theme'
import { tryCatchSync } from '@/common/utils/utils'
import { App } from './App'
import '@/common/localization/i18n'
import { createPopoverRoot } from '@/content/common/createPopoverRoot'

const { data: frameId } = await chromeRpcClient.getFrameId()

Logger.debug(`Controller script loaded in frame ${frameId}`)

const { shadowRoot, shadowStyle } = createPopoverRoot(
  'danmaku-anywhere-controller'
)

// try to get the html font size for rem unit
// if it fails, use 16 as default
const htmlFontSize =
  tryCatchSync(() => {
    return Number.parseFloat(
      window.getComputedStyle(document.documentElement).fontSize
    )
  })[0] ?? 16

shadowRoot.id = 'danmaku-anywhere-controller-root'

const cache = createCache({
  key: 'danmaku-anywhere',
  container: shadowStyle,
  prepend: true,
})

const themeOptions: ThemeOptions = {
  typography: {
    htmlFontSize,
  },
  components: {
    MuiPopover: {
      defaultProps: {
        container: shadowRoot,
      },
    },
    MuiPopper: {
      defaultProps: {
        container: shadowRoot,
      },
    },
    MuiModal: {
      defaultProps: {
        container: shadowRoot,
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          width: 'max-content', // fix an issue where the tooltip would wrap too early
        },
      },
    },
  },
}

ReactDOM.createRoot(shadowRoot).render(
  <React.StrictMode>
    <CacheProvider value={cache}>
      <QueryClientProvider client={queryClient}>
        <Theme options={themeOptions}>
          <App />
        </Theme>
      </QueryClientProvider>
    </CacheProvider>
  </React.StrictMode>
)
