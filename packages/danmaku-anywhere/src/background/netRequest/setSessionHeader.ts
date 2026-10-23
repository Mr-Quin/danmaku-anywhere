import { getSelfDomain } from './getSelfDomain'
import { addSessionRule, type SessionRuleHandle } from './sessionRules'

export interface SessionHeaderOptions {
  restrictInitiatorDomain: boolean
}

export async function setSessionHeader(
  matchUrl: string,
  headers: Record<string, string>,
  options: SessionHeaderOptions
): Promise<SessionRuleHandle> {
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
      initiatorDomains: options.restrictInitiatorDomain
        ? [getSelfDomain()]
        : undefined,
    },
  }))
}
