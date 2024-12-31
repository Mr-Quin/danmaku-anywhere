import { tryCatch } from '../utils/utils'

import { RpcException } from './types'
import type {
  AnyRPCDef,
  RPCPayload,
  RPCRecord,
  RPCResponse,
  RpcOptions,
} from './types'

import { chromeSender, tabSender } from '@/common/rpc/sender'

export type ClientMessageSender<TInput, TOutput> = (
  payload: RPCPayload<TInput>
) => Promise<RPCResponse<TOutput>>

export interface RPCClientResponse<TRPCDef extends AnyRPCDef> {
  data: TRPCDef['output']
  context: TRPCDef['context']
}

type ChromeRPCClient<TRecords extends RPCRecord> = {
  [TKey in keyof TRecords]: (
    input: TRecords[TKey]['input'],
    options?: RpcOptions
  ) => Promise<RPCClientResponse<TRecords[TKey]>>
}

export interface TabOptions {
  tabInfo?: chrome.tabs.QueryInfo
  getTab?: (tabs: chrome.tabs.Tab[]) => chrome.tabs.Tab
}

export type TabRPCClientMethod<TDef extends AnyRPCDef> = (
  input: TDef['input'],
  options?: RpcOptions,
  tabOptions?: TabOptions
) => Promise<RPCClientResponse<TDef>>

type TabRPCClient<TRecords extends RPCRecord> = {
  [TKey in keyof TRecords]: TabRPCClientMethod<TRecords[TKey]>
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

const handleRpcResponse = <TRecords extends RPCRecord>(
  result: RPCResponse<TRecords[string]['output']> | null,
  method: string,
  err: Error | null
): RPCClientResponse<TRecords[string]> => {
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

export const createChromeRpcClient = <
  TRecords extends RPCRecord,
  TInput = TRecords[string]['input'],
>(): ChromeRPCClient<TRecords> => {
  return new Proxy(
    {},
    {
      get(_, method: string) {
        return async (input: TInput, options?: RpcOptions) => {
          const [result, err] = await tryCatch(() =>
            chromeSender(createPayload(method, input, options))
          )

          return handleRpcResponse(result, method, err)
        }
      },
    }
  ) as ChromeRPCClient<TRecords>
}

export const createTabRpcClient = <
  TRecords extends RPCRecord,
  TInput = TRecords[string]['input'],
>(): TabRPCClient<TRecords> => {
  return new Proxy(
    {},
    {
      get(_, method: string) {
        return async (
          input: TInput,
          options?: RpcOptions,
          tabInfo: TabOptions = {}
        ) => {
          const [result, err] = await tryCatch(() =>
            tabSender(
              createPayload(method, input, options),
              tabInfo.tabInfo ?? {},
              tabInfo.getTab
            )
          )

          return handleRpcResponse(result, method, err)
        }
      },
    }
  ) as TabRPCClient<TRecords>
}
