import { QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { Theme } from '@/common/style/Theme'
import { queryClient } from '@/common/queryClient'
import { DanmakuDbProvider } from '@/common/indexedDb/IndexedDbContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Theme>
      <QueryClientProvider client={queryClient}>
        <DanmakuDbProvider>
          <App />
        </DanmakuDbProvider>
      </QueryClientProvider>
    </Theme>
  </React.StrictMode>
)
