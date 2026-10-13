import { AppError } from '@/common/errors/AppError'
import { chromeSender, tabSender } from '@/common/rpc/sender'
import { deserializeError } from '../utils/serializeError'
import type {
  AnyRPCDef,
  RPCPayload,
  RPCRecord,
  RPCResponse,
  RpcOptions,
} from './types'

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

type Delivery<T> =
  | { delivered: true; response: RPCResponse<T> | undefined }
  | { delivered: false; error: unknown }

async function deliver<T>(
  send: () => Promise<RPCResponse<T>>
): Promise<Delivery<T>> {
  try {
    return { delivered: true, response: await send() }
  } catch (error) {
    return { delivered: false, error }
  }
}

// Points the error's stack at the code that made the call instead of the
// continuation that settled it.
function atCallSite<E extends Error>(error: E, callSite: Error): E {
  const frames = callSite.stack?.split('\n').slice(1).join('\n')
  if (frames) {
    error.stack = `${error.name}: ${error.message}\n${frames}`
  }
  return error
}

function isCloneFailure(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'DataCloneError'
}

function deliveryFailure(method: string, error: unknown): Error {
  if (isCloneFailure(error)) {
    return error as DOMException
  }
  console.warn(`[RPC] "${method}" could not be delivered:`, error)
  return new AppError(
    'rpc.unreachable',
    {},
    { message: `Method ${method} could not be delivered`, cause: error }
  )
}

function handleRpcResponse<T>(
  delivery: Delivery<T>,
  method: string,
  callSite: Error,
  options?: RpcOptions
): RPCClientResponse<AnyRPCDef> {
  if (!delivery.delivered) {
    if (options?.optional) {
      return emptyResponse
    }
    throw atCallSite(deliveryFailure(method, delivery.error), callSite)
  }

  const result = delivery.response
  if (!result) {
    if (options?.optional) {
      return emptyResponse
    }
    throw atCallSite(
      new Error(
        `Method ${method} returned undefined. This likely means the method is not handled by the server.`
      ),
      callSite
    )
  }

  if (result.state === 'errored') {
    if (options?.optional) {
      console.warn(`[RPC] Optional call "${method}" errored:`, result.error)
      return emptyResponse
    }
    if (result.detail) {
      throw deserializeError(result.detail)
    }
    throw atCallSite(new Error(result.error), callSite)
  }

  if (result.state === 'ignored') {
    if (options?.optional) {
      return emptyResponse
    }
    throw atCallSite(
      new Error(`Method ${method} is explicitly ignored by the server.`),
      callSite
    )
  }

  return {
    data: result.output,
    context: result.context,
  }
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
          const callSite = new Error(`RPC ${method}`)
          const delivery = await deliver(() =>
            chromeSender(createPayload(method, input, options))
          )
          return handleRpcResponse(delivery, method, callSite, options)
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
          const callSite = new Error(`RPC ${method}`)
          const delivery = await deliver(() =>
            tabSender(
              createPayload(method, input, options),
              tabInfo.tabInfo,
              tabInfo.getTab
            )
          )
          return handleRpcResponse(delivery, method, callSite, options)
        }
      },
    }
  ) as TabRPCClient<TRecords>
}
