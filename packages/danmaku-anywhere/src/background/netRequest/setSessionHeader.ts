import { ExtensionOptionsService } from '@/common/options/extensionOptions/service'
import { container } from '../ioc'
import { getSelfDomain } from './getSelfDomain'
import { addSessionRule, type SessionRuleHandle } from './sessionRules'

export async function setSessionHeader(
  matchUrl: string,
  headers: Record<string, string>
): Promise<SessionRuleHandle> {
  const extensionOptionsService = container.get(ExtensionOptionsService)
  const options = await extensionOptionsService.get()

  return addSessionRule((id) => ({
    id,
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
  }))
}
