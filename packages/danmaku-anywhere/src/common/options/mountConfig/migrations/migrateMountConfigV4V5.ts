/** biome-ignore-all lint/suspicious/noExplicitAny: no access to previous type when upgrading */
import { produce } from 'immer'

export function migrateMountConfigV4V5(data: any, context: any): any {
  try {
    return data
      .map((config: any) => {
        // add the mode field
        try {
          const next = produce<any>(config, (draft) => {
            if (!draft.integration) {
              draft.mode = 'manual'
            } else {
              // read the integration
              const integration = context.xpathPolicy.find(
                (policy: any) => policy.id === draft.integration
              )
              if (integration) {
                if (integration.policy.options.useAI) {
                  draft.mode = 'ai'
                  draft.integration = undefined
                } else {
                  draft.mode = 'xpath'
                }
              }
            }
          })
          return next
        } catch {
          return null
        }
      })
      .filter((item: any) => item !== null)
  } catch {
    // fallback to empty array
    return []
  }
}
