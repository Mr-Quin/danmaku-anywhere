import createCache from '@emotion/cache'
import { CacheProvider } from '@emotion/react'
import type { ThemeOptions } from '@mui/material'
import { QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import ReactDOM from 'react-dom/client'

import { App } from './App'

import { Logger } from '@/common/Logger'
import { queryClient } from '@/common/queryClient'
import { Theme } from '@/common/theme/Theme'
import { tryCatchSync } from '@/common/utils/utils'
import '@/common/localization/i18n'

const createPopoverRoot = (id: string) => {
  const root = document.createElement('div')
  root.id = id
  root.style.setProperty('position', 'absolute', 'important')
  root.style.setProperty('z-index', '2147483647', 'important')
  root.style.setProperty('left', '0', 'important')
  root.style.setProperty('top', '0', 'important')

  // make the root element a popover, so it can be shown on top of everything
  root.setAttribute('popover', 'manual')

  // create shadow dom
  const shadowContainer = root.attachShadow({ mode: 'closed' })
  const shadowRoot = document.createElement('div')

  shadowContainer.appendChild(shadowRoot)

  return { root, shadowContainer, shadowRoot }
}

Logger.debug('Danmaku Anywhere content script loaded')

// create root element
const { root, shadowContainer, shadowRoot } =
  createPopoverRoot('danmaku-anywhere')

document.body.append(root)
root.showPopover()

// Listen to fullscreenchange event and keep popover on top
document.addEventListener('fullscreenchange', () => {
  /**
   * When the video enters full screen, hide then show the popover
   * so that it will appear on top of the full screen element,
   * since the last element in the top layer is shown on top
   */
  root.hidePopover()
  root.showPopover()
})

const emotionRoot = document.createElement('style')
shadowContainer.appendChild(emotionRoot)

// prevent global styles from leaking into shadow dom
// TODO: rem unit is still affected by html { font-size }
emotionRoot.textContent = `
:host {
  all : initial;
}
`

// try to get the html font size for rem unit
// if it fails, use 16 as default
const htmlFontSize =
  tryCatchSync(() => {
    return parseFloat(
      window.getComputedStyle(document.documentElement).fontSize
    )
  })[0] ?? 16

const cache = createCache({
  key: 'danmaku-anywhere',
  container: emotionRoot,
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
