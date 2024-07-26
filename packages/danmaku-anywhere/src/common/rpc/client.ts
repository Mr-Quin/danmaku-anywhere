import { tryCatch } from '../utils/utils'

import {
  RpcException,
  type RPCPayload,
  type RPCRecord,
  type RPCResponse,
} from './types'

import { chromeSender } from '@/common/rpc/sender'

type ClientMessageSender<TInput, TOutput> = (
  payload: RPCPayload<TInput>
) => Promise<RPCResponse<TOutput>>

type RPCClient<TRecords extends RPCRecord> = {
  [TKey in keyof TRecords]: (
    input: TRecords[TKey]['input']
  ) => Promise<TRecords[TKey]['output']>
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

          if (!result.success) {
            throw new RpcException(result.error)
          }

          return result.output
        }
      },
    }
  ) as RPCClient<TRecords>
}
