import { tryCatch } from '../utils/utils'

import { RpcException } from './types'
import type { AnyRPCDef, RPCPayload, RPCRecord, RPCResponse } from './types'

import { chromeSender } from '@/common/rpc/sender'

export type ClientMessageSender<TInput, TOutput> = (
  payload: RPCPayload<TInput>
) => Promise<RPCResponse<TOutput>>

export interface RPCClientResponse<TRPCDef extends AnyRPCDef> {
  data: TRPCDef['output']
  context: TRPCDef['context']
}

type RPCClient<TRecords extends RPCRecord> = {
  [TKey in keyof TRecords]: (
    input: TRecords[TKey]['input']
  ) => Promise<RPCClientResponse<TRecords[TKey]>>
}

const createPayload = <TInput>(
  method: string,
  input: TInput
): RPCPayload<TInput> => {
  return {
    method,
    input,
  }
}

export const createRpcClient = <
  TRecords extends RPCRecord,
  TInput = TRecords[string]['input'],
  TOutput = TRecords[string]['output'],
>(
  messageSender: ClientMessageSender<TInput, TOutput> = chromeSender
): RPCClient<TRecords> => {
  return new Proxy(
    {},
    {
      get(_, method: string) {
        return async (input: TInput) => {
          const [result, err] = await tryCatch(() =>
            messageSender(createPayload(method, input))
          )

          if (err) {
            throw new RpcException(err.message)
          }

          // if message is not handled, result will be undefined, we treat that as an error
          if (!result) {
            throw new RpcException(`Unhandled method: ${method}`)
          }

          if (result.state === 'errored') {
            throw new RpcException(result.error)
          }

          if (result.state === 'ignored') {
            throw new RpcException(
              `Message explicitly ignored by server: ${method}`
            )
          }

          return {
            data: result.output,
            context: result.context,
          } satisfies RPCClientResponse<TRecords[string]>
        }
      },
    }
  ) as RPCClient<TRecords>
}
