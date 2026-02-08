import type { RPCClientResponse } from '@/common/rpc/client'
import type { RPCRecord, RpcContext } from '@/common/rpc/types'

export type StandaloneRpcHandlers<TRecords extends RPCRecord> = Partial<{
  [TKey in keyof TRecords]: (
    input: TRecords[TKey]['input']
  ) => TRecords[TKey]['output']
}>

type StandaloneRpcOptions<TRecords extends RPCRecord> = {
  handlers?: StandaloneRpcHandlers<TRecords>
  defaultContext?: RpcContext
  defaultOutput?: (
    method: keyof TRecords,
    input: TRecords[string]['input']
  ) => TRecords[keyof TRecords]['output']
}

type StandaloneRpcClient<TRecords extends RPCRecord> = {
  [TKey in keyof TRecords]: (
    input: TRecords[TKey]['input'],
    options?: unknown
  ) => Promise<RPCClientResponse<TRecords[TKey]>>
}

export const createStandaloneRpcClient = <TRecords extends RPCRecord>(
  options: StandaloneRpcOptions<TRecords> = {}
): StandaloneRpcClient<TRecords> => {
  const { handlers = {}, defaultContext = {}, defaultOutput } = options

  return new Proxy(
    {},
    {
      get(_, method: string) {
        return async (input: TRecords[string]['input']) => {
          const handler = handlers[method as keyof TRecords] as
            | ((value: TRecords[string]['input']) => TRecords[string]['output'])
            | undefined

          const output =
            handler?.(input) ??
            defaultOutput?.(method as keyof TRecords, input) ??
            (undefined as unknown as TRecords[keyof TRecords]['output'])

          return {
            data: output,
            context: defaultContext,
          } satisfies RPCClientResponse<TRecords[string]>
        }
      },
    }
  ) as StandaloneRpcClient<TRecords>
}
