import jsonata from 'jsonata'
import { helpers } from '../helpers/registry.js'

export class EvalTimeoutError extends Error {
  constructor(public readonly timeoutMs: number) {
    super(`JSONata evaluation exceeded ${timeoutMs}ms`)
    this.name = 'EvalTimeoutError'
  }
}

/**
 * Pure-functional JSONata evaluator. Compiles expressions on first use and
 * caches them; subsequent evaluations of the same expression skip the parse.
 *
 * The cache is per-instance, not global. This matters for library use: a host
 * embedding the engine inside a long-lived process can decide cache lifetime
 * (one evaluator per manifest, one per pipeline run, one per process) rather
 * than inheriting an unbounded module-level map.
 *
 * Bounds: simple max-size cap (size-based eviction of oldest entries). LRU
 * is unnecessary for the expected workload — manifests have a fixed
 * expression set, evaluator cache hit rate is essentially 100% after warmup.
 *
 * Every evaluation is wall-clock-bounded by `timeoutMs` (Promise.race against
 * a timer). JSONata itself doesn't expose true cancellation, so an in-flight
 * eval that hits the timer keeps running internally but its result is
 * discarded; the consumer sees an EvalTimeoutError. This mitigates ReDoS in
 * `$regexExtract` and pathological JSONata expressions in a malicious manifest.
 */
export class JsonataEvaluator {
  private cache = new Map<string, jsonata.Expression>()
  private readonly maxCacheSize: number
  private readonly timeoutMs: number

  constructor(opts: { maxCacheSize?: number; timeoutMs?: number } = {}) {
    this.maxCacheSize = opts.maxCacheSize ?? 1000
    this.timeoutMs = opts.timeoutMs ?? 250
  }

  /** Compile (or look up) an expression with helpers registered. */
  private compile(expr: string): jsonata.Expression {
    const cached = this.cache.get(expr)
    if (cached !== undefined) {
      return cached
    }
    const compiled = jsonata(expr)
    for (const [name, fn] of Object.entries(helpers)) {
      compiled.registerFunction(name, fn as never)
    }
    if (this.cache.size >= this.maxCacheSize) {
      const oldest = this.cache.keys().next().value
      if (oldest !== undefined) {
        this.cache.delete(oldest)
      }
    }
    this.cache.set(expr, compiled)
    return compiled
  }

  /**
   * Evaluate an expression against a context. Result is normalized.
   * Throws EvalTimeoutError if the evaluation exceeds the configured timeout.
   */
  async eval(expr: string, context: unknown): Promise<unknown> {
    const compiled = this.compile(expr)
    const raw = await raceWithTimeout(
      compiled.evaluate(context),
      this.timeoutMs
    )
    return normalize(raw)
  }

  /** Evaluate expecting a string result; throws on type mismatch. */
  async evalString(expr: string, context: unknown): Promise<string> {
    const v = await this.eval(expr, context)
    if (typeof v !== 'string') {
      throw new TypeError(
        `expression "${expr}" produced ${typeof v}, expected string`
      )
    }
    return v
  }

  /** Clear the cache. Useful between independent pipeline runs in tests. */
  clear(): void {
    this.cache.clear()
  }
}

/**
 * JSONata returns Arrays with a `sequence: true` property attached in some
 * projection cases. Strip the extra property so result equality is stable
 * (e.g. for vitest's `toEqual` checks).
 */
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

async function raceWithTimeout<T>(
  work: Promise<T>,
  timeoutMs: number
): Promise<T> {
  if (timeoutMs <= 0) {
    return work
  }
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new EvalTimeoutError(timeoutMs)), timeoutMs)
  })
  try {
    return await Promise.race([work, timeout])
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer)
    }
  }
}

/**
 * Module-scope default evaluator. Convenience for code paths that don't
 * thread an instance through (existing tests, simple use). Library users
 * who care about lifetime should construct their own JsonataEvaluator.
 */
export const defaultEvaluator = new JsonataEvaluator()

export function evalExpr(expr: string, context: unknown): Promise<unknown> {
  return defaultEvaluator.eval(expr, context)
}

export function evalString(expr: string, context: unknown): Promise<string> {
  return defaultEvaluator.evalString(expr, context)
}
