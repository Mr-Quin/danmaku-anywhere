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

export type RPCServerHandlers<TRecords extends RPCRecord> = {
  [TKey in keyof TRecords]: RRPServerHandler<TRecords[TKey]>
}

const MAX_LOGGED_STRING = 64

function shapeOf(value: unknown): unknown {
  if (Array.isArray(value)) {
    return `array(${value.length})`
  }
  if (typeof value === 'string') {
    return value.length > MAX_LOGGED_STRING ? `string(${value.length})` : value
  }
  if (typeof value === 'object' && value !== null) {
    return 'object'
  }
  return value
}

// Inputs and outputs can be whole comment lists or files, and every logged
// argument is serialized to be forwarded to the background, so only the top
// level is logged, with sizes in place of lists and long text.
export function summarizePayload(value: unknown): unknown {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, shapeOf(item)])
    )
  }
  return shapeOf(value)
}

function senderSummary(sender: chrome.runtime.MessageSender) {
  return { tab: sender.tab?.id, frame: sender.frameId }
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

  listen(messageEvent: typeof chrome.runtime.onMessage) {
    messageEvent.addListener(this.listener)
  }

  unlisten(messageEvent: typeof chrome.runtime.onMessage) {
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
      this.logger.debug('Received message:', {
        method,
        input: summarizePayload(input),
        sender: senderSummary(sender),
      })
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

    const elapsed = Date.now() - time

    if (!options?.silent) {
      this.logger.debug(
        'Sending response:',
        {
          method,
          state: output.state,
          output:
            output.state === 'success'
              ? summarizePayload(output.output)
              : undefined,
          sender: senderSummary(sender),
        },
        `(${elapsed}ms)`
      )
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
