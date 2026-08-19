import { addSessionRule, type SessionRuleHandle } from './sessionRules'

// Adds ACAO:* to a media URL's response so a crossorigin video reads origin-clean,
// and drops the request's Origin header, which hotlink- or bot-protected CDNs
// reject. The injected ACAO satisfies the browser's check either way, so the
// request the server sees is the same one it already served the player.
// Not initiator-restricted: the host page (not the extension) fetches the media.
export function setMediaCorsRule(matchUrl: string): Promise<SessionRuleHandle> {
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
    },
  }))
}
