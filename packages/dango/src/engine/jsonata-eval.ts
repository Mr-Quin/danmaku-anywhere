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
// result array. Strip it so structural equality (test toEqual) is stable.
function normalize(v: unknown): unknown {
  if (Array.isArray(v)) {
    return v.map(normalize)
  }
  if (v && typeof v === 'object') {
    const out: Record<string, unknown> = {}
    for (const k of Object.keys(v as object)) {
      out[k] = normalize((v as Record<string, unknown>)[k])
    }
    return out
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
