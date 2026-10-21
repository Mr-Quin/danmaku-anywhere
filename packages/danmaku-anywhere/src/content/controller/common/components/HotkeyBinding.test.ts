import { describe, expect, it } from 'vitest'
import { isTypingInto } from './HotkeyBinding'

function typedInto(element: HTMLElement) {
  const host = document.createElement('div')
  document.body.append(host)
  host.attachShadow({ mode: 'open' }).append(element)
  let typing: boolean | undefined
  document.addEventListener(
    'keydown',
    (event) => {
      typing = isTypingInto(event)
    },
    { once: true }
  )
  element.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'U', bubbles: true, composed: true })
  )
  return typing
}

describe('isTypingInto', () => {
  it('sees an input inside a shadow root under a plain div', () => {
    expect(typedInto(document.createElement('input'))).toBe(true)
  })

  it('lets a key pressed on a button through', () => {
    expect(typedInto(document.createElement('button'))).toBe(false)
  })
})
