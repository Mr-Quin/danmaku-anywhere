import { i18n } from '@/common/localization/i18n'
import type { Hotkey } from '@/common/options/extensionOptions/schema'
import { createLocalizationMap } from '@/common/utils/createLocalizationMap'
import { properCase } from '@/common/utils/utils'

export const createHotkey = (key: string, enabled = true) => {
  return {
    key,
    enabled,
  }
}

export const ALL_HOTKEYS = [
  'toggleEnableDanmaku',
  'togglePip',
  'refreshComments',
  'unmountComments',
  'openSearchPanel',
  'nextEpisode',
  'prevEpisode',
] as const

export type AllHotkeys = (typeof ALL_HOTKEYS)[number]

export const HOTKEY_LABELS = createLocalizationMap<AllHotkeys>({
  toggleEnableDanmaku: () =>
    i18n.t('optionsPage.hotkeys.toggleEnableDanmaku', 'Show/Hide danmaku'),
  togglePip: () =>
    i18n.t('optionsPage.hotkeys.togglePip', 'Picture-in-picture'),
  refreshComments: () =>
    i18n.t('optionsPage.hotkeys.refreshComments', 'Refresh comments'),
  unmountComments: () =>
    i18n.t('optionsPage.hotkeys.unmountComments', 'Unmount comments'),
  openSearchPanel: () =>
    i18n.t('optionsPage.hotkeys.openSearchPanel', 'Open search panel'),
  nextEpisode: () => i18n.t('optionsPage.hotkeys.nextEpisode', 'Next episode'),
  prevEpisode: () =>
    i18n.t('optionsPage.hotkeys.prevEpisode', 'Previous episode'),
})

export type Keymap = Record<AllHotkeys, Hotkey>

export const defaultKeymap: Keymap = {
  toggleEnableDanmaku: createHotkey('shift+b'),
  refreshComments: createHotkey('shift+r'),
  unmountComments: createHotkey('shift+u'),
  togglePip: createHotkey('shift+p'),
  openSearchPanel: createHotkey('alt+k'),
  nextEpisode: createHotkey('shift+.'),
  prevEpisode: createHotkey('shift+,'),
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

interface FormatHotkeyComboOptions {
  isMacOs?: boolean
  separator?: string
}

export function formatHotkeyCombo(
  combo: string,
  { isMacOs = false, separator = '+' }: FormatHotkeyComboOptions = {}
): string {
  if (!combo) {
    return ''
  }
  const symbolMap = getKeySymbolMap({ isMacOs })
  return combo
    .split('+')
    .map((key) => (key in symbolMap ? symbolMap[key] : properCase(key)))
    .join(separator)
}
