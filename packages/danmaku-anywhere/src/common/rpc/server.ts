import { Logger } from '../services/Logger'

import type { RPCPayload, RPCRecord, RPCResponse } from './rpc'

type RPCServerHandlers<TRecords extends RPCRecord> = {
  [TKey in keyof TRecords]: (
    input: TRecords[TKey]['input'],
    sender: chrome.runtime.MessageSender
  ) => Promise<TRecords[TKey]['output']>
}

export const createRpcServer = <TRecords extends RPCRecord>(
  handlers: RPCServerHandlers<TRecords>
) => {
  return {
    onMessage: async (
      message: RPCPayload<any>,
      sender: chrome.runtime.MessageSender
    ): Promise<RPCResponse<any>> => {
      const { method, input } = message

      Logger.debug('Received message:', message)

      const time = Date.now()

      const handler = handlers[method]

      const getResult = async (): Promise<RPCResponse<any>> => {
        if (!handler) {
          return {
            success: false,
            error: 'Unsupported method',
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
      }

      const elapsed = Date.now() - time

      Logger.debug('Sending response:', meta, `(${elapsed}ms)`)

      return output
    },
  }
}
