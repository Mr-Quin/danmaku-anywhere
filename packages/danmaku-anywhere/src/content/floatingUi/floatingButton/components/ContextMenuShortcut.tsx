import { ContextMenuItemProps } from './ContextMenuItem'
import { useHotkeys } from 'react-hotkeys-hook'

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
