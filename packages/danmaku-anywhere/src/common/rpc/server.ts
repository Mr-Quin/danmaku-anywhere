import { Logger } from '../Logger'

import type { RPCPayload, RPCRecord, RPCResponse } from './types'

type RPCServerHandlers<TRecords extends RPCRecord> = {
  [TKey in keyof TRecords]: (
    input: TRecords[TKey]['input'],
    sender: chrome.runtime.MessageSender
  ) => Promise<TRecords[TKey]['output']>
}

interface CreateRpcServerOptions {
  logger?: typeof Logger
}

export const createRpcServer = <TRecords extends RPCRecord>(
  handlers: RPCServerHandlers<TRecords>,
  { logger = Logger }: CreateRpcServerOptions = {}
) => {
  const listener: Parameters<
    typeof chrome.runtime.onMessage.addListener
  >[number] = (message, sender, sendResponse) => {
    if (methods.hasHandler(message.method)) {
      methods
        .onMessage(message, sender)
        .then((res) => sendResponse(res))
        .catch(logger.debug)
      return true
    }
  }

  const methods = {
    listen: () => {
      chrome.runtime.onMessage.addListener(listener)
    },
    unlisten: () => {
      chrome.runtime.onMessage.removeListener(listener)
    },
    hasHandler: (method: string) => method in handlers,
    onMessage: async (
      message: RPCPayload<any>,
      sender: chrome.runtime.MessageSender
    ): Promise<RPCResponse<any>> => {
      const { method, input } = message

      logger.debug('Received message:', message)

      const time = Date.now()

      const handler = handlers[method]

      const getResult = async (): Promise<RPCResponse<any>> => {
        if (!handler) {
          return {
            success: false,
            error: `Unknown method: ${method}`,
          }
        }

        try {
          return {
            success: true,
            output: await handler(input, sender),
          }
        } catch (e: unknown) {
          if (e instanceof Error) {
            return {
              success: false,
              error: e.message,
            }
          }

          return {
            success: false,
            error: 'Something went wrong',
          }
        }
      }

      const output = await getResult()

      const meta = {
        method,
        input,
        output,
        sender,
      }

      const elapsed = Date.now() - time

      logger.debug('Sending response:', meta, `(${elapsed}ms)`)

      return output
    },
  }
  return methods
}
