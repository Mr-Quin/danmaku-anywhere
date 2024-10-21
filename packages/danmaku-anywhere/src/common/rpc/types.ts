// output must not be undefined because undefined is not treated well by react-query
type NotUndefined<T> = T extends undefined ? never : T

export type RpcContext = Record<string, any>

export interface RpcOptions {
  silent?: boolean
}

export interface RPCDef<
  TInput,
  TOutput,
  TContext extends RpcContext = RpcContext,
> {
  input: TInput
  output: NotUndefined<TOutput>
  context: TContext
}

export type AnyRPCDef = RPCDef<any, any>

export type RPCRecord = Record<string, AnyRPCDef>

export interface RPCPayload<TInput> {
  method: string
  input: TInput
  options?: RpcOptions
}

interface RPCSuccessResponse<
  TOutput,
  TContext extends RpcContext = RpcContext,
> {
  state: 'success'
  output: TOutput
  context: TContext
}

interface RPCErrorResponse {
  state: 'errored'
  error: string
}

interface RPCIgnoreResponse {
  state: 'ignored'
}

export type RPCResponse<TOutput> =
  | RPCSuccessResponse<TOutput>
  | RPCErrorResponse
  | RPCIgnoreResponse

export class RpcException extends Error {
  constructor(public error: string) {
    super(error)
  }
}
