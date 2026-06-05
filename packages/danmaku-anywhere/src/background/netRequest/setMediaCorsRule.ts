import { addSessionRule, type SessionRuleHandle } from './sessionRules'

// Injects `Access-Control-Allow-Origin: *` onto a single media URL's response so
// a `crossorigin="anonymous"` video element can load it origin-clean, letting the
// occlusion segmenter read its frames. Unlike request-header rules this is NOT
// restricted to the extension's own initiator: the media is fetched by the host
// page, so the rule must match that page's request.
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
