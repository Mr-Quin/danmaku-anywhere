import { Logger } from '../Logger'

import type { RpcContext, RPCPayload, RPCRecord, RPCResponse } from './types'

type RPCServerHandlers<TRecords extends RPCRecord> = {
  [TKey in keyof TRecords]: (
    input: TRecords[TKey]['input'],
    sender: chrome.runtime.MessageSender,
    setContext: (context: RpcContext) => void
  ) => Promise<TRecords[TKey]['output']>
}

interface CreateRpcServerOptions<TContext extends RpcContext> {
  logger?: typeof Logger
  context?: TContext
}

export const createRpcServer = <
  TRecords extends RPCRecord,
  TContext extends RpcContext = RpcContext,
>(
  handlers: RPCServerHandlers<TRecords>,
  { logger = Logger, context }: CreateRpcServerOptions<TContext> = {}
) => {
  const listener: Parameters<
    typeof chrome.runtime.onMessage.addListener
  >[number] = (message, sender, sendResponse) => {
    if (methods.hasHandler(message.method)) {
      methods
        .onMessage(message, sender)
        .then((res) => sendResponse(res))
        .catch(logger.error)
      return true
    }
  }

  let baseContext = { ...context }

  const setContext = (newContext: RpcContext) => {
    baseContext = newContext
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
      message: RPCPayload<unknown>,
      sender: chrome.runtime.MessageSender
    ): Promise<RPCResponse<unknown>> => {
      const { method, input } = message

      logger.debug('Received message:', message)

      const time = Date.now()

      const handler = handlers[method]

      const getResult = async (): Promise<RPCResponse<unknown>> => {
        if (!handler) {
          return {
            success: false,
            error: `Unknown method: ${method}`,
          }
        }

        try {
          return {
            success: true,
            output: await handler(input, sender, setContext),
            context: baseContext,
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
