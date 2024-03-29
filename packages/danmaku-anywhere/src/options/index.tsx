import { QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import ReactDOM from 'react-dom/client'

import { queryClient } from '@/common/queryClient'
import { Theme } from '@/common/style/Theme'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Theme>
      <QueryClientProvider client={queryClient}></QueryClientProvider>
    </Theme>
  </React.StrictMode>
)
