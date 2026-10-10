import { addSessionRule, type SessionRuleHandle } from './sessionRules'

// Makes a crossorigin video read origin-clean: injects ACAO and drops the Origin
// header that hotlink-protected CDNs reject. Not initiator-restricted, since the
// host page fetches the media, so it is scoped to the requesting tab instead.
export function setMediaCorsRule(
  matchUrl: string,
  tabId?: number
): Promise<SessionRuleHandle> {
  return addSessionRule((id) => ({
    id,
    action: {
      type: 'modifyHeaders',
      requestHeaders: [
        {
          header: 'Origin',
          operation: 'remove',
        },
      ],
      responseHeaders: [
        {
          header: 'Access-Control-Allow-Origin',
          operation: 'set',
          value: '*',
        },
      ],
    },
    condition: {
      urlFilter: `|${matchUrl}`,
      resourceTypes: ['media'],
      tabIds: tabId === undefined ? undefined : [tabId],
    },
  }))
}
