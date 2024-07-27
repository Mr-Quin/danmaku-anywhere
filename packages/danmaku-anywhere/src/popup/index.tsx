import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

import { App } from './App'

import { queryClient } from '@/common/queryClient'
import { Theme } from '@/common/theme/Theme'
import '@/common/localization/i18n'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <Theme>
        <App />
        <ReactQueryDevtools />
      </Theme>
    </QueryClientProvider>
  </React.StrictMode>
)
