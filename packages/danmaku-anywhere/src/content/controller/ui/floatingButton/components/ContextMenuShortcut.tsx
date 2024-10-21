import { useHotkeys } from 'react-hotkeys-hook'

import type { ContextMenuItemProps } from './ContextMenuItem'

export const ContextMenuShortcut = ({
  hotkey,
  disabled,
  action,
}: ContextMenuItemProps) => {
  useHotkeys(hotkey ?? '', action, {
    enabled: !!hotkey && !disabled?.(),
  })

  return null
}
