import {
  type DnrContext,
  type DnrRuleSpec,
  resolveDnrTemplate,
} from './dnrTemplate'
import { type SessionHeaderOptions, setSessionHeader } from './setSessionHeader'

export function runWithDnr(
  spec: DnrRuleSpec,
  options: SessionHeaderOptions,
  context: DnrContext = {}
) {
  async function dnrRunner<T>(action: () => Promise<T>): Promise<T> {
    const headers = resolveDnrTemplate(spec.template, context)

    await using _ = await setSessionHeader(spec.matchUrl, headers, options)

    return await action()
  }

  return dnrRunner
}
