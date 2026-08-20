import { addSessionRule, type SessionRuleHandle } from './sessionRules'

// Adds ACAO:* to a media URL's response so a crossorigin video reads origin-clean,
// and drops the request's Origin header, which hotlink- or bot-protected CDNs
// reject. The injected ACAO satisfies the browser's check either way. The server
// still sees a CORS-mode request, just without the embedding origin.
//
// The rule overrides the server's own origin policy for one URL, so it is scoped
// to the tab that asked for it and lives only as long as the clone. It is not
// initiator-restricted: the host page, not the extension, fetches the media.
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
