import type { Hotkey } from '@/common/options/extensionOptions/schema'

export const createHotkey = (key: string, enabled = true) => {
  return {
    key,
    enabled,
  }
}

export const allHotkeys = [
  'toggleEnableDanmaku',
  'togglePip',
  'refreshComments',
  'unmountComments',
  'toggleSkipButton',
  'toggleDanmakuTimeline',
] as const

export type AllHotkeys = (typeof allHotkeys)[number]

export type Keymap = Record<AllHotkeys, Hotkey>

export const defaultKeymap: Keymap = {
  toggleEnableDanmaku: createHotkey('shift+b'),
  refreshComments: createHotkey('shift+r'),
  unmountComments: createHotkey('shift+u'),
  togglePip: createHotkey('shift+p'),
  toggleSkipButton: createHotkey('shift+s'),
  toggleDanmakuTimeline: createHotkey('shift+d'),
} as const

const macModifierSymbols: Record<string, string> = {
  ctrl: '⌃',
  shift: '⇧',
  alt: '⌥',
  meta: '⌘',
}

const keySymbols: Record<string, string> = {
  ctrl: 'Ctrl',
  shift: 'Shift',
  alt: 'Alt',
  meta: 'Win',
  arrowLeft: '←',
  arrowRight: '→',
  arrowUp: '↑',
  arrowDown: '↓',
  ' ': 'Space',
  backspace: '⌫',
}

interface GetKeySymbolMapOptions {
  isMacOs?: boolean
}

export const getKeySymbolMap = ({
  isMacOs = false,
}: GetKeySymbolMapOptions = {}) => {
  if (isMacOs) {
    return { ...keySymbols, ...macModifierSymbols }
  }
  return keySymbols
}
