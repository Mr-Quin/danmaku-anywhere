import { chromeSender, tabSender } from '@/common/rpc/sender'
import { tryCatch } from '@/common/utils/tryCatch'
import { deserializeError } from '../utils/serializeError'
import type {
  AnyRPCDef,
  RPCPayload,
  RPCRecord,
  RPCResponse,
  RpcOptions,
} from './types'
import { RpcException } from './types'

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

// Intentionally cast: optional calls return undefined data, which doesn't match
// the declared output type. All optional callers should discard the return value.
// biome-ignore lint/suspicious/noExplicitAny: see above
const emptyResponse = { data: undefined, context: {} } as RPCClientResponse<any>

const handleRpcResponse = <TRecords extends RPCRecord>(
  result: RPCResponse<TRecords[string]['output']> | null,
  method: string,
  err: Error | null,
  options?: RpcOptions
): RPCClientResponse<TRecords[string]> => {
  if (err) {
    if (options?.optional) return emptyResponse
    throw new RpcException(err.message, { cause: err })
  }

  if (!result) {
    if (options?.optional) return emptyResponse
    throw new RpcException(
      `Method ${method} returned undefined. This likely means the method is not handled by the server.`
    )
  }

  if (result.state === 'errored') {
    if (options?.optional) {
      console.warn(`[RPC] Optional call "${method}" errored:`, result.error)
      return emptyResponse
    }
    throw new RpcException(result.error, {
      cause: result.detail ? deserializeError(result.detail) : undefined,
    })
  }

  if (result.state === 'ignored') {
    if (options?.optional) return emptyResponse
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

          return handleRpcResponse(result, method, err, options)
        }
      },
    }
  ) as ChromeRPCClient<TRecords>
}

export const createContentRpcClient = <
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
              tabInfo.tabInfo,
              tabInfo.getTab
            )
          )

          return handleRpcResponse(result, method, err, options)
        }
      },
    }
  ) as TabRPCClient<TRecords>
}
