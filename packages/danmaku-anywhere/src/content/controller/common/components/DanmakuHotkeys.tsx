import { HotkeyBinding } from '@/content/controller/common/components/HotkeyBinding'
import { useDanmakuActions } from '@/content/controller/common/hooks/useDanmakuActions'

export const DanmakuHotkeys = () => {
  const actions = useDanmakuActions()

  return actions.map((action, i) => <HotkeyBinding key={i} {...action} />)
}
