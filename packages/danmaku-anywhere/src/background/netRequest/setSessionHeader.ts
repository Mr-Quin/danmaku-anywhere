import { Mutex } from 'async-mutex'

const mutex = new Mutex()

export async function setSessionHeader(
  matchUrl: string,
  headers: Record<string, string>
) {
  const release = await mutex.acquire()

  try {
    const nextRuleId =
      (await chrome.declarativeNetRequest.getSessionRules()).length + 1

    await chrome.declarativeNetRequest.updateSessionRules({
      addRules: [
        {
          id: nextRuleId,
          action: {
            type: 'modifyHeaders',
            requestHeaders: Object.entries(headers).map(([header, value]) => ({
              header,
              operation: 'set',
              value,
            })),
          },
          condition: {
            urlFilter: `|${matchUrl}`,
            resourceTypes: ['xmlhttprequest'],
          },
        },
      ],
    })

    return async function removeRule() {
      await chrome.declarativeNetRequest.updateSessionRules({
        removeRuleIds: [nextRuleId],
      })
    }
  } finally {
    release()
  }
}

type Headers = Record<string, string>

export interface WithSessionHeaderOptions<Args extends unknown[]> {
  matchUrl: string
  headers: Headers
  getHeaders?: (args: Args) => Headers
}

// decorator that sets session header for a method
export function WithSessionHeader<Args extends unknown[]>(
  options: WithSessionHeaderOptions<Args>
) {
  return function wrap(
    target: Object,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value

    async function overrideMethod(this: unknown, ...args: Args) {
      let resolvedHeaders = options.headers

      if (options.getHeaders) {
        resolvedHeaders = { ...options.headers, ...options.getHeaders(args) }
      }

      const removeRule = await setSessionHeader(
        options.matchUrl,
        resolvedHeaders
      )

      try {
        return await originalMethod.apply(this, args)
      } finally {
        await removeRule()
      }
    }
    descriptor.value = overrideMethod

    return descriptor
  }
}
