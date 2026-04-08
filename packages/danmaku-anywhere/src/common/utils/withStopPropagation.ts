import type { KeyboardEvent, KeyboardEventHandler } from 'react'

interface WithStopPropagationOptions<T extends Element> {
  onKeyPressCapture?: KeyboardEventHandler<T>
  onKeyDownCapture?: KeyboardEventHandler<T>
  whitelistKeys?: string[]
}

interface WithStopPropagationHandlers<T extends Element> {
  onKeyPressCapture?: KeyboardEventHandler<T>
  onKeyDownCapture?: KeyboardEventHandler<T>
}

const defaultWhitelistKeys = ['Escape', 'Enter']

export function withStopPropagation<T extends Element>(
  options: WithStopPropagationOptions<T> = {}
): WithStopPropagationHandlers<T> {
  const { whitelistKeys = defaultWhitelistKeys, ...handlers } = options

  const isWhitelistKey = (e: KeyboardEvent<T>) => {
    return whitelistKeys.includes(e.key)
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
    // deprecated event, but some websites still use this event so we need to stop propagation for it
    onKeyPressCapture: (e) => {
      intercept(e, handlers.onKeyPressCapture)
    },
  }
}
