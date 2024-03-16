import createCache from '@emotion/cache'
import { CacheProvider } from '@emotion/react'
import type { ThemeOptions } from '@mui/material'
import { QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import ReactDOM from 'react-dom/client'

import { App } from './App'

import { queryClient } from '@/common/queryClient'
import { Theme } from '@/common/style/Theme'

const root = document.createElement('div')
document.body.append(root)
root.id = 'danmaku-anywhere'

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

const cache = createCache({
  key: 'danmaku-anywhere',
  container: emotionRoot,
  prepend: true,
})

const themeOptions: ThemeOptions = {
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
  // fab container has a z-index of 9999, so we need to make sure any popper is above it
  zIndex: {
    mobileStepper: 10000,
    fab: 10500,
    speedDial: 10500,
    appBar: 11000,
    drawer: 12000,
    modal: 13000,
    snackbar: 14000,
    tooltip: 15000,
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
