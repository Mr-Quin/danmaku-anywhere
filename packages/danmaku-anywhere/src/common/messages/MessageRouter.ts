import { Logger } from '../services/Logger'

import { Message, MessageResponse } from './message'

type SendReponse = (response: MessageResponse) => void

type Sender = chrome.runtime.MessageSender

interface MessageHandler<T extends Message = any> {
  (
    request: T['payload'],
    sender: Sender,
    sendResponse: SendReponse
  ): Promise<any>
}

export class MessageRouter {
  private handlers: Map<string, MessageHandler> = new Map()

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
