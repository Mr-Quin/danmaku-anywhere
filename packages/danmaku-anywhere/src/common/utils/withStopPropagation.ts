import type { KeyboardEvent, KeyboardEventHandler } from 'react'

interface WithStopPropagationHandlers<T extends Element> {
  onKeyPressCapture?: KeyboardEventHandler<T>
  onKeyDownCapture?: KeyboardEventHandler<T>
}

export const withStopPropagation = <T extends Element>(
  handlers: WithStopPropagationHandlers<T> = {}
): WithStopPropagationHandlers<T> => {
  const isWhitelistKey = (e: KeyboardEvent<T>) => {
    return e.key === 'Escape' || e.key === 'Enter'
  }

  const intercept = (
    e: KeyboardEvent<T>,
    handler?: KeyboardEventHandler<T>
  ) => {
    if (isWhitelistKey(e)) {
      handler?.(e)
      return
    }

    e.stopPropagation()
    handler?.(e)
  }

  return {
    onKeyDownCapture: (e) => {
      intercept(e, handlers.onKeyDownCapture)
    },
    onKeyPressCapture: (e) => {
      intercept(e, handlers.onKeyPressCapture)
    },
  }
}
