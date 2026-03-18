import { type ILogger, Logger } from '../Logger'
import { serializeError } from '../utils/serializeError'

import type {
  AnyRPCDef,
  RPCPayload,
  RPCRecord,
  RPCResponse,
  RpcContext,
  RpcOptions,
} from './types'

export type RRPServerHandler<TDef extends AnyRPCDef> = (
  input: TDef['input'],
  sender: chrome.runtime.MessageSender,
  setContext: (context: RpcContext) => void,
  options?: RpcOptions
) => Promise<TDef['output']>

type RPCServerHandlers<TRecords extends RPCRecord> = {
  [TKey in keyof TRecords]: RRPServerHandler<TRecords[TKey]>
}

// biome-ignore lint/suspicious/noExplicitAny: the input can be any type
type Filter = (method: string, input: any) => boolean

interface CreateRpcServerOptions<TContext extends RpcContext> {
  logger?: ILogger
  context?: TContext
  // Filter based on input, return false to ignore message
  filter?: Filter
}

class RpcServer<TRecords extends RPCRecord> {
  private baseContext: RpcContext
  private readonly listener: Parameters<
    typeof chrome.runtime.onMessage.addListener
  >[number]

  constructor(
    private readonly handlers: RPCServerHandlers<TRecords>,
    private readonly logger: ILogger,
    context: RpcContext | undefined,
    private readonly filter?: Filter
  ) {
    this.baseContext = { ...context }

    this.listener = (message: RPCPayload<unknown>, sender, sendResponse) => {
      if (this.hasHandler(message.method)) {
        if (
          this.filter &&
          !this.filter(message.method, message.input as Record<string, unknown>)
        ) {
          return
        }

        this.onMessage(message, sender)
          .then((res) => sendResponse(res))
          .catch(this.logger.error)
        return true
      }
    }
  }

  listen(messageEvent: chrome.runtime.ExtensionMessageEvent) {
    messageEvent.addListener(this.listener)
  }

  unlisten(messageEvent: chrome.runtime.ExtensionMessageEvent) {
    messageEvent.removeListener(this.listener)
  }

  setContext(newContext: RpcContext) {
    this.baseContext = newContext
  }

  private hasHandler(method: string) {
    return method in this.handlers
  }

  private async onMessage(
    message: RPCPayload<unknown>,
    sender: chrome.runtime.MessageSender
  ): Promise<RPCResponse<unknown>> {
    const { method, input, options } = message

    if (!options?.silent) {
      this.logger.debug('Received message:', { ...message, sender })
    }

    const time = Date.now()

    const handler = this.handlers[method]

    const getResult = async (): Promise<RPCResponse<unknown>> => {
      if (!handler) {
        return {
          state: 'errored',
          error: `Unknown method: ${method}`,
        }
      }

      let messageContext = { ...this.baseContext }

      const setContext = (newContext: RpcContext) => {
        messageContext = { ...newContext }
      }

      try {
        return {
          state: 'success',
          output: await handler(input, sender, setContext, options),
          context: messageContext,
        }
      } catch (e: unknown) {
        const errorJson = serializeError(e)
        this.logger.error('Error in RPC handler:', errorJson)
        return {
          state: 'errored',
          error: errorJson.message,
          detail: errorJson,
        }
      }
    }

    const output = await getResult()

    const meta = {
      method,
      input,
      output,
      sender,
      baseContext: this.baseContext,
    }

    const elapsed = Date.now() - time

    if (!options?.silent) {
      this.logger.debug('Sending response:', meta, `(${elapsed}ms)`)
    }

    return output
  }
}

export const createRpcServer = <
  TRecords extends RPCRecord,
  TContext extends RpcContext = RpcContext,
>(
  handlers: RPCServerHandlers<TRecords>,
  { logger = Logger, context, filter }: CreateRpcServerOptions<TContext> = {}
) => {
  return new RpcServer(handlers, logger, context, filter)
}
