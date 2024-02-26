import type { PayloadOf } from './message'

export interface IconMessage {
  action: 'icon/set'
  payload: {
    state: 'active' | 'inactive' | 'available' | 'unavailable'
  }
}

export const iconMessage = {
  set: async (payload: PayloadOf<IconMessage, 'icon/set'>) => {
    return await chrome.runtime.sendMessage({
      action: 'icon/set',
      payload,
    })
  },
}
