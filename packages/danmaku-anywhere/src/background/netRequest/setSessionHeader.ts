import { Mutex } from 'async-mutex'
import { ExtensionOptionsService } from '@/common/options/extensionOptions/service'
import { container } from '../ioc'
import { getSelfDomain } from './getSelfDomain'

const mutex = new Mutex()

export async function setSessionHeader(
  matchUrl: string,
  headers: Record<string, string>
) {
  const release = await mutex.acquire()

  using stack = new DisposableStack()
  stack.defer(() => release())

  const extensionOptionsService = container.get(ExtensionOptionsService)
  const options = await extensionOptionsService.get()

  const rules = await chrome.declarativeNetRequest.getSessionRules()
  const maxId = rules.reduce((max, rule) => Math.max(max, rule.id), 0)
  const nextRuleId = maxId + 1

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
          initiatorDomains:
            options.restrictInitiatorDomain !== false
              ? [getSelfDomain()]
              : undefined,
        },
      },
    ],
  })

  async function removeRule() {
    await chrome.declarativeNetRequest.updateSessionRules({
      removeRuleIds: [nextRuleId],
    })
  }

  return {
    removeRule,
    async [Symbol.asyncDispose]() {
      await removeRule()
    },
  }
}
