import jsonata from 'jsonata'
import { helpers } from '../helpers/registry.js'

/** JSONata evaluator with a per-instance FIFO-bounded compile cache. */
export class JsonataEvaluator {
  private cache = new Map<string, jsonata.Expression>()
  private readonly maxCacheSize: number

  constructor(opts: { maxCacheSize?: number } = {}) {
    this.maxCacheSize = opts.maxCacheSize ?? 1000
  }

  private compile(expr: string): jsonata.Expression {
    const cached = this.cache.get(expr)
    if (cached !== undefined) return cached
    const compiled = jsonata(expr)
    for (const [name, fn] of Object.entries(helpers)) {
      compiled.registerFunction(name, fn as never)
    }
    if (this.cache.size >= this.maxCacheSize) {
      const oldest = this.cache.keys().next().value
      if (oldest !== undefined) this.cache.delete(oldest)
    }
    this.cache.set(expr, compiled)
    return compiled
  }

  async eval(expr: string, context: unknown): Promise<unknown> {
    return normalize(await this.compile(expr).evaluate(context))
  }

  async evalString(expr: string, context: unknown): Promise<string> {
    const v = await this.eval(expr, context)
    if (typeof v !== 'string') {
      throw new TypeError(
        `expression "${expr}" produced ${typeof v}, expected string`
      )
    }
    return v
  }

  clear(): void {
    this.cache.clear()
  }
}

// JSONata projections sometimes attach a `sequence: true` property to the
// result array. Strip it (via slice/recurse) so structural equality is stable
// for tests, but skip the walk when the marker isn't present — for large
// pipelines (10k+ rows from danmaku endpoints) the deep clone dominates
// post-eval cost.
function normalize(v: unknown): unknown {
  if (Array.isArray(v)) {
    if (!(v as unknown as Record<string, unknown>).sequence) {
      return v
    }
    return v.map(normalize)
  }
  return v
}

export const defaultEvaluator = new JsonataEvaluator()

export function evalExpr(expr: string, context: unknown): Promise<unknown> {
  return defaultEvaluator.eval(expr, context)
}

export function evalString(expr: string, context: unknown): Promise<string> {
  return defaultEvaluator.evalString(expr, context)
}
