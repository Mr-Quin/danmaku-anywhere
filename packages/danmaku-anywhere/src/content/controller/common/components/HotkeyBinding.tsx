import { useHotkeys } from 'react-hotkeys-hook'

import type { ContextMenuItemProps } from '@/content/controller/ui/floatingButton/components/ContextMenuItem'

export const HotkeyBinding = ({
  hotkey,
  disabled,
  action,
}: ContextMenuItemProps) => {
  useHotkeys(hotkey ?? '', action, {
    enabled: !!hotkey && !disabled?.(),
  })

  return null
}
