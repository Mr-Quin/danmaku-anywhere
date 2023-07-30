import React from 'react'
import ReactDOM from 'react-dom/client'
import { Content } from './content'

const root = document.createElement('div')
root.id = 'danmaku-anywhere-root'
document.body.prepend(root)

console.log('content script loaded')

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <Content />
  </React.StrictMode>
)
