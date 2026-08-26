import type { RPCServerHandlers } from '@/common/rpc/server'
import type { RPCRecord } from '@/common/rpc/types'
import { RpcException } from '@/common/rpc/types'
import type { BackgroundMethods } from '@/common/rpcClient/background/types'

/**
 * The only commands a website may run through chrome.runtime.onMessageExternal.
 * Everything else in the background RPC surface is denied, including commands
 * added later: a command becomes reachable from a website only by being listed
 * here.
 */
export const EXTERNAL_RPC_ALLOWLIST = [
  'mountConfigGetAll',
  'mountConfigCreate',
] as const satisfies readonly (keyof BackgroundMethods)[]

export function gateExternalHandlers<TRecords extends RPCRecord>(
  handlers: RPCServerHandlers<TRecords>,
  allowlist: readonly (keyof TRecords & string)[]
): RPCServerHandlers<TRecords> {
  const allowed = new Set<string>(allowlist)
  const gated = { ...handlers }

  for (const method of Object.keys(gated) as (keyof TRecords & string)[]) {
    if (allowed.has(method)) {
      continue
    }
    gated[method] = async () => {
      throw new RpcException(
        `Method ${method} is not available to external callers`
      )
    }
  }

  return gated
}
