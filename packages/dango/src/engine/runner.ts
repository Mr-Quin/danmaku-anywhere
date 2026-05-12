import type {
  Manifest,
  Pipeline,
  Step,
  VariantPipeline,
} from '../manifest/schema.js'
import {
  AbortedError,
  executeRequest,
  type FetchLike,
  throwIfAborted,
} from './http.js'
import { evalExpr } from './jsonata-eval.js'
import type { ProtoRegistry } from './proto.js'

export type Context = Record<string, unknown>

export interface RunOptions {
  fetcher?: FetchLike
  /** Cancel the pipeline. Checked between steps and threaded into fetch. */
  signal?: AbortSignal
  /**
   * Per-response body size cap in bytes (default 5MB). Bounds memory and
   * protects against malicious or compromised upstreams returning huge
   * bodies. A manifest cannot raise this — it's a host policy.
   */
  maxResponseBytes?: number
  /**
   * Maximum number of iterations a single `forEach` step may perform.
   * Defaults to 1000. Caps both manifest-authored and upstream-driven
   * iteration arrays. `$range` has a tighter cap (10k) inside the helper.
   */
  maxForEachIterations?: number
  /**
   * Required if any pipeline step uses `format: 'proto'`. Compiles inline
   * `.proto` schemas from `manifest.protoSchemas` lazily and caches per
   * instance. `ManifestRunner` constructs one automatically.
   */
  protoRegistry?: ProtoRegistry
}

const DEFAULT_MAX_FOREACH_ITERATIONS = 1000

async function runHttpExtract(
  response: unknown,
  extract: Record<string, string> | undefined
): Promise<unknown> {
  if (!extract) {
    return response
  }
  const bag: Record<string, unknown> = {}
  for (const [name, expr] of Object.entries(extract)) {
    bag[name] = await evalExpr(expr, response)
  }
  return bag
}

async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  throttleMs: number,
  signal: AbortSignal | undefined,
  task: (item: T) => Promise<R>
): Promise<R[]> {
  /**
   * Shared earliest-next-start timestamp so that even with concurrency > 1,
   * no two requests start within throttleMs of each other.
   */
  let earliestStart = 0
  const waitForSlot = async () => {
    if (throttleMs <= 0) return
    const now = Date.now()
    if (now < earliestStart) {
      /**
       * Abort-aware sleep: reject the wait as soon as the signal fires,
       * so an aborted pipeline doesn't sit idle for up to 60s waiting for
       * a throttle timer to elapse before the next throwIfAborted check.
       */
      await new Promise<void>((resolve, reject) => {
        const delay = earliestStart - now
        const timer = setTimeout(() => {
          signal?.removeEventListener('abort', onAbort)
          resolve()
        }, delay)
        const onAbort = () => {
          clearTimeout(timer)
          reject(new AbortedError())
        }
        if (signal?.aborted) {
          clearTimeout(timer)
          reject(new AbortedError())
          return
        }
        signal?.addEventListener('abort', onAbort, { once: true })
      })
    }
    earliestStart = Math.max(earliestStart, Date.now()) + throttleMs
  }

  if (limit <= 1 || items.length <= 1) {
    const out: R[] = []
    for (const item of items) {
      await waitForSlot()
      out.push(await task(item))
    }
    return out
  }
  const results: R[] = new Array(items.length)
  let next = 0
  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (true) {
        const i = next++
        if (i >= items.length) return
        await waitForSlot()
        results[i] = await task(items[i] as T)
      }
    }
  )
  await Promise.all(workers)
  return results
}

async function runStep(
  step: Step,
  context: Context,
  manifest: Manifest,
  options: RunOptions
): Promise<void> {
  throwIfAborted(options.signal)

  if (step.type === 'assign') {
    const bag: Record<string, unknown> = {}
    for (const [name, expr] of Object.entries(step.values)) {
      bag[name] = await evalExpr(expr, context)
    }
    context[step.id] = bag
    return
  }

  if (step.type === 'forEach') {
    const items = await evalExpr(step.in, context)
    if (!Array.isArray(items)) {
      throw new TypeError(
        `forEach.in must evaluate to an array, got ${typeof items}`
      )
    }
    /**
     * Bound iteration regardless of where the array came from. `$range` is
     * already capped, but `forEach.in` accepts any JSONata expression — a
     * manifest could produce a huge array from upstream data.
     */
    const cap = options.maxForEachIterations ?? DEFAULT_MAX_FOREACH_ITERATIONS
    if (items.length > cap) {
      throw new Error(
        `forEach "${step.id}" produced ${items.length} items, exceeds cap ${cap}`
      )
    }
    const perItemResults = await runWithConcurrency(
      items,
      step.concurrency,
      step.throttleMs,
      options.signal,
      async (element: unknown) => {
        throwIfAborted(options.signal)
        const iterContext: Context = { ...context, [step.as]: element }
        const response = await executeRequest(step.request, iterContext, {
          fetcher: options.fetcher,
          allowedHosts: manifest.hosts,
          signal: options.signal,
          maxResponseBytes: options.maxResponseBytes,
          protoRegistry: options.protoRegistry,
        })
        const extracted = await runHttpExtract(response, step.extract)
        if (!step.collect) {
          return extracted
        }
        return evalExpr(step.collect, extracted)
      }
    )
    /**
     * Flat-concat: any per-iteration result that's an array contributes its
     * elements; non-arrays contribute themselves. Matches the "loop yields a
     * single flat array" intuition.
     */
    const flat: unknown[] = []
    for (const r of perItemResults) {
      if (Array.isArray(r)) {
        flat.push(...r)
      } else if (r !== null && r !== undefined) {
        flat.push(r)
      }
    }
    context[step.id] = flat
    return
  }

  // http
  const response = await executeRequest(step.request, context, {
    fetcher: options.fetcher,
    allowedHosts: manifest.hosts,
    signal: options.signal,
    maxResponseBytes: options.maxResponseBytes,
    protoRegistry: options.protoRegistry,
  })
  if (!step.id) {
    return
  }
  context[step.id] = await runHttpExtract(response, step.extract)
}

/**
 * Pipeline fields on a Manifest are always VariantPipeline[] after parse
 * (the schema normalizes single Pipeline → [Pipeline]). This is also the
 * shape the runner accepts.
 */
export type PipelineInput = VariantPipeline[]

async function selectVariant(
  variants: VariantPipeline[],
  context: Context
): Promise<VariantPipeline> {
  for (const v of variants) {
    if (v.when === undefined) {
      return v
    }
    const matched = await evalExpr(v.when, context)
    if (matched) {
      return v
    }
  }
  throw new Error('no pipeline variant matched (and no unconditional default)')
}

export async function runPipeline(
  manifest: Manifest,
  variants: PipelineInput,
  inputs: Record<string, unknown>,
  options: RunOptions = {}
): Promise<unknown> {
  const initialContext: Context = { ...inputs }
  const pipeline: Pipeline = await selectVariant(variants, initialContext)
  for (const required of pipeline.inputs) {
    if (!(required in inputs)) {
      throw new Error(`missing required input: ${required}`)
    }
  }
  const context: Context = { ...inputs }
  for (const step of pipeline.steps) {
    throwIfAborted(options.signal)
    await runStep(step, context, manifest, options)
  }
  throwIfAborted(options.signal)
  return evalExpr(pipeline.output, context)
}
