import { produce } from 'immer'

import type { AllHotkeys } from '@/common/options/extensionOptions/hotkeys'
import { useExtensionOptions } from '@/common/options/extensionOptions/useExtensionOptions'

export const useHotkeyOptions = () => {
  const { data, partialUpdate, ...rest } = useExtensionOptions()

  const hotkeys = data.hotkeys

  const updateHotkey = async (label: AllHotkeys, key: string) => {
    return partialUpdate(
      produce(data, (draft) => {
        draft.hotkeys[label] = {
          key,
          enabled: true,
        }
      })
    )
  }

  const getKeyCombo = (label: AllHotkeys) => {
    return hotkeys[label]?.key ?? ''
  }

  return {
    hotkeys,
    updateHotkey,
    getKeyCombo,
    ...rest,
  }
}
