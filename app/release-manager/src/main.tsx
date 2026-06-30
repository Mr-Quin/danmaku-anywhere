import '@fontsource-variable/plus-jakarta-sans'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App.js'
import { Theme } from './theme/Theme.js'

const container = document.getElementById('root')
if (container) {
  createRoot(container).render(
    <StrictMode>
      <Theme>
        <App />
      </Theme>
    </StrictMode>
  )
}
