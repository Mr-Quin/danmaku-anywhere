import { addSessionRule, type SessionRuleHandle } from './sessionRules'

// Adds ACAO:* to a media URL's response so a crossorigin video reads origin-clean.
// Not initiator-restricted: the host page (not the extension) fetches the media.
export function setMediaCorsRule(matchUrl: string): Promise<SessionRuleHandle> {
  return addSessionRule((id) => ({
    id,
    action: {
      type: 'modifyHeaders',
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
