import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import createCache from '@emotion/cache'
import { CacheProvider } from '@emotion/react'
import { Content } from './Content'
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

const cache = createCache({
  key: 'danmaku-anywhere',
  container: emotionRoot,
  prepend: true,
})

ReactDOM.createRoot(shadowRootElement).render(
  <React.StrictMode>
    <Theme>
      <CacheProvider value={cache}>
        <QueryClientProvider client={queryClient}>
          <Content />
        </QueryClientProvider>
      </CacheProvider>
    </Theme>
  </React.StrictMode>
)
