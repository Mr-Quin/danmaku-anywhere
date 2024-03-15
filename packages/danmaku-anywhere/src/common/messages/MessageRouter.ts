import { Logger } from '../services/Logger'

import type { Message, MessageResponse } from './message'

type SendReponse = (response: MessageResponse) => void

type Sender = chrome.runtime.MessageSender

type MessageHandler<T extends Message = any> = (
  request: T['payload'],
  sender: Sender,
  sendResponse: SendReponse
) => Promise<any>

// maybe switch to a type safe solution like trpc
export class MessageRouter {
  private handlers = new Map<string, MessageHandler>()

  on<T extends Message>(action: T['action'], handler: MessageHandler<T>) {
    this.handlers.set(action, handler)
  }

  getListener() {
    return (request: Message, sender: Sender, sendResponse: SendReponse) => {
      for (const [action, handler] of this.handlers.entries()) {
        if (request.action === action) {
          handler(request.payload, sender, sendResponse).catch((err) => {
            Logger.error(err)
            sendResponse({ success: false, error: err.message })
          })

          return true // return true to indicate that the response will be sent asynchronously
        }
      }
    }
  }
}
