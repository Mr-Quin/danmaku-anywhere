import React from 'react'
import ReactDOM from 'react-dom/client'
import { Content } from './Content'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/common/queryClient'
import { Theme } from '@/common/style/Theme'

const root = document.createElement('div')
root.id = 'danmaku-anywhere-root'
document.body.prepend(root)

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <Theme>
      <QueryClientProvider client={queryClient}>
        <Content />
      </QueryClientProvider>
    </Theme>
  </React.StrictMode>
)
