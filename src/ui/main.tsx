import { render } from 'preact'

import App from './App'

export const mount = (el: HTMLElement) => {
  render(
    <App />,
    (() => {
      const app = document.createElement('div')
      el.prepend(app)
      return app
    })()
  )
}
