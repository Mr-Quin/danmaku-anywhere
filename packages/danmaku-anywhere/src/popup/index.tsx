import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { Theme } from '@/common/style/Theme'
import { DanmakuDbProvider } from '@/common/indexedDb/IndexedDbContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Theme>
      <DanmakuDbProvider>
        <App />
      </DanmakuDbProvider>
    </Theme>
  </React.StrictMode>
)
