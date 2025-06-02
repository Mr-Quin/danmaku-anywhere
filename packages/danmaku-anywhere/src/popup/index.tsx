import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

import { App } from './App'

import { queryClient } from '@/common/queries/queryClient'
import { Theme } from '@/common/theme/Theme'
import '@/common/localization/i18n'
import { EnvironmentProvider } from '@/popup/context/Environment'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <Theme>
        <EnvironmentProvider isPopup>
          <App />
        </EnvironmentProvider>
        <ReactQueryDevtools />
      </Theme>
    </QueryClientProvider>
  </React.StrictMode>
)
