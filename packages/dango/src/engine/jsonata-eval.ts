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

// JSONata projections attach a `sequence: true` property to result arrays.
// Strip it so structural equality is stable for tests. Copy-on-write: only
// allocate when a marker is actually present somewhere in the tree —
// otherwise return the original value. For 10k+ row danmaku outputs the old
// unconditional deep clone was 50-400ms of allocation per call.
function normalize(v: unknown): unknown {
  if (Array.isArray(v)) {
    const arr = v as unknown[] & { sequence?: unknown }
    // slice() drops the non-indexed `sequence` marker from the copy.
    const hasSequenceMarker = arr.sequence !== undefined
    let cloned: unknown[] | null = hasSequenceMarker ? arr.slice() : null
    for (let i = 0; i < arr.length; i++) {
      const inner = arr[i]
      const next = normalize(inner)
      if (next !== inner) {
        if (cloned === null) {
          cloned = arr.slice()
        }
        cloned[i] = next
      }
    }
    return cloned ?? v
  }
  if (v && typeof v === 'object') {
    const obj = v as Record<string, unknown>
    let cloned: Record<string, unknown> | null = null
    for (const k of Object.keys(obj)) {
      const inner = obj[k]
      const next = normalize(inner)
      if (next !== inner) {
        if (cloned === null) {
          cloned = { ...obj }
        }
        cloned[k] = next
      }
    }
    return cloned ?? v
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
