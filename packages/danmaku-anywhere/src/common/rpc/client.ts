import { tryCatch } from '../utils'

import type { BackgroundMethods } from './interface/background'
import type { TabMethods } from './interface/tab'
import {
  type RPCPayload,
  type RPCResponse,
  type RPCRecord,
  RpcException,
} from './rpc'

type ClientMessageSender<TInput, TOutput> = (
  payload: RPCPayload<TInput>
) => Promise<RPCResponse<TOutput>>

type RPCClient<TRecords extends RPCRecord> = {
  [TKey in keyof TRecords]: (
    input: TRecords[TKey]['input']
  ) => Promise<TRecords[TKey]['output']>
}

const chromeSender = async <TInput, TOutput>(payload: RPCPayload<TInput>) => {
  return (await chrome.runtime.sendMessage(payload)) as RPCResponse<TOutput>
}

const tabSender = async <TInput, TOutput>(payload: RPCPayload<TInput>) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

  return (await chrome.tabs.sendMessage(
    tab.id as number,
    payload
  )) as RPCResponse<TOutput>
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

const createRpcClient = <
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

export const chromeRpcClient = createRpcClient<BackgroundMethods>(chromeSender)

export const tabRpcClient = createRpcClient<TabMethods>(tabSender)
