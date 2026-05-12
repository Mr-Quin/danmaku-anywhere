import { z } from 'zod'
import { validateHostPattern } from '../engine/host-policy.js'

/** A JSONata expression. Evaluated against the pipeline context. */
const zExpr = z.string()

/**
 * Templated string: anywhere we accept a string, we actually accept a JSONata
 * expression that should evaluate to a string. Keeps the surface uniform.
 */
const zString = zExpr

const zHttpMethod = z.enum(['GET', 'POST'])

const zResponseFormat = z.enum(['json', 'xml', 'text', 'jsonp', 'proto'])

/**
 * Headers allowed in `rewriteHeaders`. These are wire-level overrides applied
 * by the host (e.g. via chrome.declarativeNetRequest in the extension). The
 * engine itself doesn't know about DNR — it just passes rewriteHeaders to the
 * FetchLike implementation.
 *
 * Cookie / Authorization / Set-Cookie are absolutely forbidden everywhere
 * (manifest cannot forge auth). Origin / Referer / User-Agent are the
 * cosmetic-but-necessary "looks like a real client" headers many upstreams
 * validate.
 */
export const REWRITE_HEADER_ALLOWLIST = new Set([
  'origin',
  'referer',
  'user-agent',
])

const zRewriteHeaders = z
  .record(z.string(), zExpr)
  .refine(
    (obj) =>
      Object.keys(obj).every((k) =>
        REWRITE_HEADER_ALLOWLIST.has(k.toLowerCase())
      ),
    {
      message:
        'rewriteHeaders key not in allowlist (Origin/Referer/User-Agent)',
    }
  )

export const zRequestSpec = z.object({
  method: zHttpMethod.default('GET'),
  url: zString,
  headers: z.record(z.string(), zString).optional(),
  /**
   * Query params: a JSONata expression evaluating to an object. Values become
   * URL-encoded query params. Build the object in a prior `assign` step so it
   * can be reused for signing without re-declaring keys.
   */
  query: zExpr.optional(),
  /** Body: a JSONata expression evaluating to an object (JSON-encoded), string, or null. */
  body: zExpr.optional(),
  /** How to parse the response body. */
  format: zResponseFormat.default('json'),
  /** If 'include', attaches the browser's cookies for the host. Extension-context only. */
  credentials: z.enum(['include', 'omit']).default('omit'),
  /**
   * Named protoSchema entry (from Manifest.protoSchemas) when `format: 'proto'`.
   * Combined with `protoMessage` to resolve the binary decoder.
   */
  protoSchema: z.string().optional(),
  /** Fully-qualified message name within the protoSchema (e.g. `pkg.SubMsg`). */
  protoMessage: z.string().optional(),
  /**
   * Wire-level header rewrites. Allowlist enforced at manifest load; values
   * are JSONata expressions like everything else (so config can templatize
   * them — useful for DDP-Compat where Origin/Referer vary per installation).
   * The engine evaluates them and hands them to FetchLike via init.rewriteHeaders;
   * it doesn't know whether the host implements them with DNR or in-process.
   */
  rewriteHeaders: zRewriteHeaders.optional(),
})
export type RequestSpec = z.infer<typeof zRequestSpec>

/**
 * Step IDs become keys on the pipeline context object. Restrict them to JS
 * identifier syntax and reject the prototype-pollution-prone names.
 * `__proto__` matches the identifier regex (underscores are valid), so the
 * regex alone isn't enough — refine with an explicit denylist.
 */
const FORBIDDEN_STEP_IDS = new Set(['__proto__', 'constructor', 'prototype'])
const zStepId = z
  .string()
  .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, 'step id must be a JS-identifier')
  .refine((s) => !FORBIDDEN_STEP_IDS.has(s), {
    message: 'step id is reserved (would pollute context prototype)',
  })

const zHttpStep = z.object({
  type: z.literal('http'),
  /**
   * Identifier — output values are stored under context[id]. Required if
   * extract is set. Restricted to JS identifier-like names to prevent
   * prototype pollution via keys like `__proto__` or `constructor`.
   */
  id: zStepId.optional(),
  request: zRequestSpec,
  /**
   * Named values extracted from the response, evaluated as JSONata against
   * the parsed body. Available downstream as context[id][name].
   */
  extract: z.record(z.string(), zExpr).optional(),
})

const zAssignStep = z.object({
  type: z.literal('assign'),
  id: zStepId,
  /**
   * Pure transform — JSONata expressions evaluated against current context.
   * Useful for derived values (signed query strings, etc).
   */
  values: z.record(z.string(), zExpr),
})

const zForEachStep = z.object({
  type: z.literal('forEach'),
  id: zStepId,
  /**
   * JSONata expression evaluating to an array. Each element becomes one
   * iteration; the element is bound to `as` in the per-iteration context.
   */
  in: zExpr,
  /** Name the current element gets bound to during iteration (e.g. 'item', 'i'). */
  as: z.string().min(1),
  /**
   * Per-iteration HTTP request. Uses the same context as a normal http step
   * plus the bound element under `as`.
   */
  request: zRequestSpec,
  /**
   * Per-iteration named extracts from the response (same shape as http.extract).
   * Available within the iteration as <id>.<name>; collected via `collect`.
   */
  extract: z.record(z.string(), zExpr).optional(),
  /**
   * JSONata expression evaluated against each iteration's extract bag. The
   * resulting values are flat-concatenated into the step's final output array
   * stored at context[id]. If omitted, the entire extract bag per iteration
   * is collected.
   */
  collect: zExpr.optional(),
  /** Max concurrent in-flight requests. Default 1 (sequential). */
  concurrency: z.number().int().min(1).max(50).default(1),
  /**
   * Minimum milliseconds between consecutive request starts. Composes with
   * concurrency: with concurrency=1+throttleMs=200, each request waits ≥200ms
   * after the previous start; with concurrency=10+throttleMs=100, requests fire
   * ≤10-wide but no two start within 100ms of each other. Upper bound caps
   * runaway delay in a misbehaving manifest.
   */
  throttleMs: z.number().int().min(0).max(60_000).default(0),
})

export const zStep = z.discriminatedUnion('type', [
  zHttpStep,
  zAssignStep,
  zForEachStep,
])
export type Step = z.infer<typeof zStep>

const zPipeline = z.object({
  /**
   * Names of inputs the pipeline expects (e.g. ['q'] for search).
   * Validated at run time.
   */
  inputs: z.array(z.string()).default([]),
  steps: z.array(zStep).min(1),
  /**
   * Final JSONata expression. Evaluated against the full context;
   * result is the pipeline's output (typically an array of items).
   */
  output: zExpr,
})
export type Pipeline = z.infer<typeof zPipeline>

/**
 * Variants are an internal implementation detail: a pipeline may declare
 * multiple branches selected by a `when` expression evaluated against the
 * initial inputs context. Used when a single logical operation (e.g. fetching
 * Bilibili danmaku) has fundamentally different fetch shapes for different
 * config values (XML single-fetch vs protobuf forEach over segments).
 *
 * Provider identity (providerConfigId, providerIds) stays the same across
 * variants — they're different ways to fetch the same logical data.
 */
const zVariantPipeline = zPipeline.extend({
  /**
   * JSONata predicate. Evaluated against the inputs context; first variant
   * with a truthy result is selected. A variant without `when` is the default
   * and matches unconditionally (should be the last variant in the list).
   */
  when: zExpr.optional(),
})
export type VariantPipeline = z.infer<typeof zVariantPipeline>

/**
 * A pipeline field is either a single Pipeline (the common case) or an array
 * of VariantPipeline (when variants are needed). On parse, both normalize to
 * VariantPipeline[] for uniform downstream handling.
 */
const zPipelineField = z
  .union([zPipeline, z.array(zVariantPipeline).min(1)])
  .transform((v): VariantPipeline[] => (Array.isArray(v) ? v : [v]))

/**
 * Engine ABI versions the runtime understands. Bumps only on incompatible
 * changes (helper removal, step-type semantics, canonical schema breaks).
 * Adding optional fields / new helpers is non-breaking and does NOT bump.
 */
export const SUPPORTED_API_VERSIONS = new Set<number>([1])

/**
 * Per-installation config schema item. Manifests declare the options a user
 * can set when they install the source; values flow into the pipeline context
 * alongside per-call inputs at run time.
 */
const zConfigItem = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('string'),
    default: z.string().optional(),
    label: z.string().optional(),
    description: z.string().optional(),
    sensitive: z.boolean().default(false),
    required: z.boolean().default(false),
  }),
  z.object({
    type: z.literal('number'),
    default: z.number().optional(),
    label: z.string().optional(),
    description: z.string().optional(),
    required: z.boolean().default(false),
  }),
  z.object({
    type: z.literal('boolean'),
    default: z.boolean().optional(),
    label: z.string().optional(),
    description: z.string().optional(),
  }),
  z.object({
    type: z.literal('enum'),
    values: z.array(z.string()).min(1),
    default: z.string().optional(),
    label: z.string().optional(),
    description: z.string().optional(),
  }),
])
export type ConfigItem = z.infer<typeof zConfigItem>

export const zManifest = z.object({
  /** Engine ABI version. Rejected at load if not in SUPPORTED_API_VERSIONS. */
  apiVersion: z
    .number()
    .int()
    .positive()
    .refine((v) => SUPPORTED_API_VERSIONS.has(v), {
      message: 'unsupported apiVersion',
    }),
  /**
   * Stable identifier — becomes the sourceId / providerConfigId in stored records.
   * Allowed shapes: 'builtin:<name>', 'user:<hash>', etc. (validated at registry level)
   */
  id: z.string().regex(/^[a-z][a-z0-9_:.\-]*$/i),
  name: z.string(),
  /** Manifest's own version. Not used by the engine; for registry display + debug. */
  version: z.string(),
  /**
   * Hosts the manifest is allowed to fetch from. Wildcards via `*.example.com`.
   * The literal "*" is reserved for DDP-compat templates where host is supplied
   * via config and confirmed by the user at install time.
   */
  hosts: z
    .array(z.string())
    .min(1)
    .superRefine((arr, ctx) => {
      for (let i = 0; i < arr.length; i++) {
        try {
          validateHostPattern(arr[i] as string)
        } catch (e) {
          ctx.addIssue({
            code: 'custom',
            path: [i],
            message: e instanceof Error ? e.message : String(e),
          })
        }
      }
    }),
  /**
   * Per-installation options the user can set when installing this source.
   * Values flow into the pipeline context alongside per-call inputs. Used for
   * things like baseUrl/authHeader (DDP-compat servers) or danmakuFormat
   * toggles (XML vs protobuf for Bilibili). Empty for sources with no options.
   */
  configSchema: z.record(z.string(), zConfigItem).default({}),
  /**
   * URL match patterns. Used by the host's "which source handles this URL"
   * resolver — replaces the per-source URL-parsing logic the extension's
   * `ProviderService.initParsers()` currently hardcodes. Each entry tests:
   * URL host matches `host` (exact or `*.domain` wildcard) AND URL pathname
   * matches the `path` regex.
   *
   * Optional: a manifest without urlMatch can still be invoked directly by
   * the user via search — this field is only consulted for "auto-detect
   * which source handles this page".
   */
  urlMatch: z
    .array(
      z.object({
        host: z.string(),
        path: z.string(),
      })
    )
    .default([]),
  /**
   * Inline `.proto` schema definitions used by `format: 'proto'` requests.
   * Each value is the textual proto3 source; the engine compiles lazily on
   * first use and caches per-instance. Each schema is capped at 64KB.
   * Manifests reference these by their key via `request.protoSchema`.
   */
  protoSchemas: z.record(z.string(), z.string()).default({}),
  /**
   * Three pipelines. Each may be a single Pipeline or a list of VariantPipeline
   * (variant selection by `when` expression). On parse, both normalize to
   * VariantPipeline[]. Optional in the engine, but a manifest replacing a
   * built-in native source must implement all three.
   */
  search: zPipelineField.optional(),
  episodes: zPipelineField.optional(),
  danmaku: zPipelineField.optional(),
})
export type Manifest = z.infer<typeof zManifest>
