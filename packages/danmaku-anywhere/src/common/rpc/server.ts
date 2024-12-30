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
  // Filter based on input, return false to ignore message
  filter?: (method: string, input: any) => boolean
}

const serializeError = (error: unknown) => {
  if (error instanceof Error) {
    return error.message
  }

  try {
    return JSON.stringify(error)
  } catch {
    return 'Unknown error'
  }
}

export const createRpcServer = <
  TRecords extends RPCRecord,
  TContext extends RpcContext = RpcContext,
>(
  handlers: RPCServerHandlers<TRecords>,
  { logger = Logger, context, filter }: CreateRpcServerOptions<TContext> = {}
) => {
  const listener: Parameters<
    typeof chrome.runtime.onMessage.addListener
  >[number] = (message: RPCPayload<unknown>, sender, sendResponse) => {
    if (methods.hasHandler(message.method)) {
      // Filter out messages that don't pass the filter
      if (filter && !filter(message.method, message.input)) {
        return
      }

      methods
        .onMessage(message, sender)
        .then((res) => sendResponse(res))
        .catch(logger.error)
      return true
    }
  }

  let baseContext = { ...context }

  const methods = {
    listen: () => {
      chrome.runtime.onMessage.addListener(listener)
    },
    unlisten: () => {
      chrome.runtime.onMessage.removeListener(listener)
    },
    hasHandler: (method: string) => method in handlers,
    setContext: (newContext: RpcContext) => {
      baseContext = newContext
    },
    onMessage: async (
      message: RPCPayload<unknown>,
      sender: chrome.runtime.MessageSender
    ): Promise<RPCResponse<unknown>> => {
      const { method, input, options } = message

      if (!options?.silent) {
        logger.debug('Received message:', message)
      }

      const time = Date.now()

      const handler = handlers[method]

      const getResult = async (): Promise<RPCResponse<unknown>> => {
        if (!handler) {
          return {
            state: 'errored',
            error: `Unknown method: ${method}`,
          }
        }

        let messageContext = { ...baseContext }

        const setContext = (newContext: RpcContext) => {
          messageContext = { ...newContext }
        }

        try {
          return {
            state: 'success',
            output: await handler(input, sender, setContext),
            context: messageContext,
          }
        } catch (e: unknown) {
          logger.error('Error in RPC handler:', e)
          return {
            state: 'errored',
            error: serializeError(e),
          }
        }
      }

      const output = await getResult()

      const meta = {
        method,
        input,
        output,
        sender,
        baseContext,
      }

      const elapsed = Date.now() - time

      if (!options?.silent) {
        logger.debug('Sending response:', meta, `(${elapsed}ms)`)
      }

      return output
    },
  }
  return methods
}
