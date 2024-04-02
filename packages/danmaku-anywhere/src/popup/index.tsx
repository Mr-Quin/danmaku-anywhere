import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

import { App } from './App'

import { PortProvider } from '@/common/port/PortProvider'
import { queryClient } from '@/common/queryClient'
import { Theme } from '@/common/style/Theme'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Theme>
      <QueryClientProvider client={queryClient}>
        <PortProvider>
          <App />
        </PortProvider>
        <ReactQueryDevtools />
      </QueryClientProvider>
    </Theme>
  </React.StrictMode>
)
