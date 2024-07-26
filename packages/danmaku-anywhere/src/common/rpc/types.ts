// output must not be undefined because undefined is not treated well by react-query
type NotUndefined<T> = T extends undefined ? never : T

export interface RPCDef<TInput, TOutput> {
  input: TInput
  output: NotUndefined<TOutput>
}

export type AnyRPCDef = RPCDef<any, any>

export type RPCRecord = Record<string, AnyRPCDef>

export interface RPCPayload<TInput> {
  method: string
  input: TInput
}

interface RPCSuccessResponse<TOutput> {
  success: true
  output: TOutput
}

interface RPCErrorResponse {
  success: false
  error: string
}

export type RPCResponse<TOutput> =
  | RPCSuccessResponse<TOutput>
  | RPCErrorResponse

export class RpcException extends Error {
  constructor(public error: string) {
    super(error)
  }
}
