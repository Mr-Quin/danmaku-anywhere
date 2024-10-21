import { tryCatch } from '../utils/utils'

import { RpcException } from './types'
import type {
  AnyRPCDef,
  RPCPayload,
  RPCRecord,
  RPCResponse,
  RpcOptions,
} from './types'

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
    input: TRecords[TKey]['input'],
    options?: RpcOptions
  ) => Promise<RPCClientResponse<TRecords[TKey]>>
}

const createPayload = <TInput>(
  method: string,
  input: TInput,
  options?: RpcOptions
): RPCPayload<TInput> => {
  return {
    method,
    input,
    options,
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
        return async (input: TInput, options?: RpcOptions) => {
          const [result, err] = await tryCatch(() =>
            messageSender(createPayload(method, input, options))
          )

          if (err) {
            throw new RpcException(err.message)
          }

          // if message is not handled, result will be undefined, we treat that as an error
          if (!result) {
            throw new RpcException(
              `Method ${method} returned undefined. This likely means the method is not handled by the server.`
            )
          }

          if (result.state === 'errored') {
            throw new RpcException(result.error)
          }

          if (result.state === 'ignored') {
            throw new RpcException(
              `Method ${method} is explicitly ignored by the server.`
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
