import { TitleMapping } from '../db/db'
import { Logger } from '../services/Logger'

import { PayloadOf } from './message'

export type TitleMappingMessage =
  | {
      action: 'titleMapping/save'
      payload: TitleMapping
    }
  | {
      action: 'titleMapping/get'
      payload: Pick<TitleMapping, 'originalTitle' | 'source'>
    }

export const titleMappingMessage = {
  save: async (
    payload: PayloadOf<TitleMappingMessage, 'titleMapping/save'>
  ) => {
    Logger.debug('Saving title mapping:', payload)

    const res = await chrome.runtime.sendMessage({
      action: 'titleMapping/save',
      payload,
    })

    if (!res.success) {
      Logger.error(res.error)
      throw new Error(res.error)
    }

    Logger.debug('Title mapping saved', res.payload)
  },
  get: async (payload: PayloadOf<TitleMappingMessage, 'titleMapping/get'>) => {
    Logger.debug('Getting title mapping:', payload)

    const res = await chrome.runtime.sendMessage({
      action: 'titleMapping/get',
      payload,
    })

    if (!res.success) {
      Logger.error(res.error)
      throw new Error(res.error)
    }

    Logger.debug('Title mapping found', res.payload)

    return res.payload as string | undefined
  },
}
