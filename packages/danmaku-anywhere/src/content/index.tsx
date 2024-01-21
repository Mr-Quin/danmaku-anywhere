import createCache from '@emotion/cache'
import { CacheProvider } from '@emotion/react'
import { ThemeProvider, createTheme } from '@mui/material'
import { QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import ReactDOM from 'react-dom/client'

import { Content } from './Content'

import { queryClient } from '@/common/queryClient'
import { themeOptions } from '@/common/style/Theme'

const root = document.createElement('div')
document.body.append(root)
root.id = 'danmaku-anywhere'

const shadowContainer = root.attachShadow({ mode: 'closed' })
const emotionRoot = document.createElement('style')
const shadowRootElement = document.createElement('div')

shadowContainer.appendChild(emotionRoot)
shadowContainer.appendChild(shadowRootElement)

const cache = createCache({
  key: 'danmaku-anywhere',
  container: emotionRoot,
  prepend: true,
})

const theme = createTheme({
  ...themeOptions,
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
})

ReactDOM.createRoot(shadowRootElement).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CacheProvider value={cache}>
        <QueryClientProvider client={queryClient}>
          <Content />
        </QueryClientProvider>
      </CacheProvider>
    </ThemeProvider>
  </React.StrictMode>
)
