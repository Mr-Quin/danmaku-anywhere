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
   * Required if any pipeline step uses `format: 'proto'`. `ManifestRunner`
   * constructs one automatically.
   */
  protoRegistry?: ProtoRegistry
}

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
  // Shared earliest-next-start so concurrency > 1 still respects throttleMs.
  let earliestStart = 0
  const waitForSlot = async () => {
    if (throttleMs <= 0) return
    const now = Date.now()
    if (now < earliestStart) {
      // Abort-aware sleep; large throttleMs would otherwise delay abort.
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
          protoRegistry: options.protoRegistry,
        })
        const extracted = await runHttpExtract(response, step.extract)
        if (!step.collect) {
          return extracted
        }
        return evalExpr(step.collect, extracted)
      }
    )
    /** Flat-concat per-iteration arrays; non-array values contribute themselves. */
    const flat: unknown[] = []
    for (const r of perItemResults) {
      if (Array.isArray(r)) {
        for (const item of r) flat.push(item)
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
    protoRegistry: options.protoRegistry,
  })
  if (!step.id) {
    return
  }
  context[step.id] = await runHttpExtract(response, step.extract)
}

/** After parse, every Manifest pipeline field is normalized to this shape. */
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
