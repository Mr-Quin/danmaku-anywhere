import createCache from '@emotion/cache'
import { CacheProvider } from '@emotion/react'
import type { ThemeOptions } from '@mui/material'
import { QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import ReactDOM from 'react-dom/client'

import { App } from './App'

import { queryClient } from '@/common/queryClient'
import { Logger } from '@/common/services/Logger'
import { Theme } from '@/common/style/Theme'
import { tryCatchSync } from '@/common/utils'

Logger.debug('Danmaku Anywhere content script loaded')

// create root element
const root = document.createElement('div')
root.id = 'danmaku-anywhere'
root.style.setProperty('position', 'absolute', 'important')
root.style.setProperty('z-index', '2147483647', 'important')
root.style.setProperty('left', '0', 'important')
root.style.setProperty('top', '0', 'important')

// make the root element a popover so it can be shown on top of everything
root.setAttribute('popover', 'manual')
document.body.append(root)
root.showPopover()

// create shadow dom
const shadowContainer = root.attachShadow({ mode: 'closed' })
const emotionRoot = document.createElement('style')
const shadowRootElement = document.createElement('div')

shadowContainer.appendChild(emotionRoot)
shadowContainer.appendChild(shadowRootElement)

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
        container: shadowRootElement,
      },
    },
    MuiPopper: {
      defaultProps: {
        container: shadowRootElement,
      },
    },
    MuiModal: {
      defaultProps: {
        container: shadowRootElement,
      },
    },
  },
}

ReactDOM.createRoot(shadowRootElement).render(
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
