import type { RPCPayload, RPCResponse } from '@/common/rpc/types'
import { RpcException } from '@/common/rpc/types'

export const chromeSender = async <TInput, TOutput>(
  payload: RPCPayload<TInput>
) => {
  const res = (await chrome.runtime.sendMessage(
    payload
  )) as RPCResponse<TOutput>

  if (chrome.runtime.lastError) {
    throw new RpcException(
      chrome.runtime.lastError.message ?? 'Unknown lastError'
    )
  }

  return res
}

export const tabSender = async <TInput, TOutput>(
  payload: RPCPayload<TInput>
) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

  if (!tab) {
    throw new RpcException('No active tab found')
  }

  try {
    return (await chrome.tabs.sendMessage(
      tab.id as number,
      payload
    )) as RPCResponse<TOutput>
  } catch (e) {
    if (e instanceof Error) {
      throw new RpcException(e.message)
    }
    throw new RpcException('Unknown error occurred when sending message to tab')
  }
}
