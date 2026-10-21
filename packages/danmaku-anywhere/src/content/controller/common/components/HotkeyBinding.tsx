import { useHotkeys } from 'react-hotkeys-hook'

import type { ContextMenuItemProps } from '@/content/controller/ui/floatingButton/components/ContextMenuItem'

// The library only looks inside custom elements for the real target, and the
// extension's UI lives in a shadow root under a plain div, so it would treat
// typing in the extension's own inputs as a shortcut.
export function isTypingInto(event: KeyboardEvent): boolean {
  const [target] = event.composedPath()
  if (!(target instanceof HTMLElement)) {
    return false
  }
  return (
    target.isContentEditable ||
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
  )
}

export const HotkeyBinding = ({
  hotkey,
  disabled,
  action,
}: ContextMenuItemProps) => {
  useHotkeys(hotkey ?? '', action, {
    enabled: !!hotkey && !disabled?.(),
    ignoreEventWhen: isTypingInto,
  })

  return null
}
