import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

import { queryClient } from '@/common/queries/queryClient'
import { Theme } from '@/common/theme/Theme'
import { App } from './App'
import '@/common/localization/i18n'
import { EnvironmentContext } from '@/common/environment/context'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <EnvironmentContext
        value={{
          environment: import.meta.env.MODE,
          type: 'popup',
        }}
      >
        <Theme>
          <App />
          <ReactQueryDevtools />
        </Theme>
      </EnvironmentContext>
    </QueryClientProvider>
  </React.StrictMode>
)
