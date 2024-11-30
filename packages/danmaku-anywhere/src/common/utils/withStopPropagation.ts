import type { KeyboardEvent, KeyboardEventHandler } from 'react'

interface WithStopPropagationHandlers<T extends Element> {
  onKeyPress?: KeyboardEventHandler<T>
  onKeyDown?: KeyboardEventHandler<T>
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
    onKeyDown: (e) => {
      intercept(e, handlers.onKeyDown)
    },
    onKeyPress: (e) => {
      intercept(e, handlers.onKeyPress)
    },
  }
}
