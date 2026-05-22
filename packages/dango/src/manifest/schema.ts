import { z } from 'zod'

/** A JSONata expression evaluated against the pipeline context. */
const zExpr = z.string()

// String fields anywhere in the schema are JSONata expressions that must
// evaluate to a string. Keeps the surface uniform.
const zString = zExpr

const zHttpMethod = z.enum(['GET', 'POST'])
const zResponseFormat = z.enum(['json', 'xml', 'text', 'jsonp', 'proto'])

// Headers allowed in `rewriteHeaders`. Auth-bearing names (Cookie, Auth) are
// forbidden everywhere; these three are the ones the host applies via DNR.
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
  /**
   * Either a static map of `name → expr` (each value evaluated as a string),
   * or a single expression that evaluates to a `{ name: value }` object. Use
   * the single-expression form when header names are dynamic (e.g. a
   * user-configured auth-header list).
   */
  headers: z.union([z.record(z.string(), zString), zString]).optional(),
  /** Expression evaluating to an object; values become URL-encoded query params. */
  query: zExpr.optional(),
  /** Expression evaluating to an object (JSON-encoded), string, or null. */
  body: zExpr.optional(),
  format: zResponseFormat.default('json'),
  /** Extension-context only. Lets the browser attach cookies for the host. */
  credentials: z.enum(['include', 'omit']).default('omit'),
  /** Key in Manifest.protoSchemas; required when format is 'proto'. */
  protoSchema: z.string().optional(),
  /** Fully-qualified protobuf type (e.g. `pkg.SubMsg`); required when format is 'proto'. */
  protoMessage: z.string().optional(),
  /** Host-applied overrides for headers fetch can't set (Origin/Referer/UA). */
  rewriteHeaders: zRewriteHeaders.optional(),
  /**
   * Extra HTTP status codes the engine treats as a successful response (body
   * parsed as usual; empty bodies decode to empty payloads). 2xx is always
   * accepted. Use for upstreams that abuse 3xx as "no more data" signals
   * (e.g. Bilibili's `seg.so` returns 304 past the last danmaku segment).
   */
  acceptStatus: z.array(z.number().int()).default([]),
})
export type RequestSpec = z.infer<typeof zRequestSpec>

// Step IDs become keys on the runtime context. Reject names that would
// mutate the object's prototype instead of adding own properties.
const FORBIDDEN_STEP_IDS = new Set(['__proto__', 'constructor', 'prototype'])
const zStepId = z
  .string()
  .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, 'step id must be a JS-identifier')
  .refine((s) => !FORBIDDEN_STEP_IDS.has(s), {
    message: 'step id is reserved (would pollute context prototype)',
  })

const zHttpStep = z
  .object({
    type: z.literal('http'),
    /** Required when `extract`/`extractHeaders` is set, since extracts are stored at context[id]. */
    id: zStepId.optional(),
    request: zRequestSpec,
    /** Per-field JSONata against the response body. */
    extract: z.record(z.string(), zExpr).optional(),
    /**
     * Per-field JSONata against the response headers. Header names are
     * lower-cased before exposure (HTTP is case-insensitive). Access with
     * bracket-quoted names for headers containing `-`:
     * `` `set-cookie` ``.
     */
    extractHeaders: z.record(z.string(), zExpr).optional(),
  })
  .refine(
    (step) =>
      (step.extract === undefined && step.extractHeaders === undefined) ||
      step.id !== undefined,
    {
      message:
        'http step requires `id` when `extract` / `extractHeaders` is set',
      path: ['id'],
    }
  )

const zAssignStep = z.object({
  type: z.literal('assign'),
  id: zStepId,
  /** Per-field JSONata against the current context — derived values, signing inputs. */
  values: z.record(z.string(), zExpr),
})

const zForEachStep = z
  .object({
    type: z.literal('forEach'),
    id: zStepId,
    /** Expression evaluating to an array; each element drives one iteration. */
    in: zExpr,
    /** Name the current element is bound to during iteration. */
    as: z.string().min(1),
    request: zRequestSpec,
    extract: z.record(z.string(), zExpr).optional(),
    /** Per-iteration projection over the extract bag; flat-concatenated into context[id]. */
    collect: zExpr.optional(),
    concurrency: z.number().int().min(1).max(50).default(1),
    /** Minimum milliseconds between consecutive request starts. */
    throttleMs: z.number().int().min(0).max(60_000).default(0),
    /**
     * Optional stop predicate evaluated after each iteration's collected
     * result. If truthy, this iteration's result is included and subsequent
     * iterations are skipped. Forces sequential execution (concurrency:1)
     * because parallel iterations would race past the stop signal. Used for
     * cursor-style pagination ("stop when this page is partial").
     */
    breakOn: zExpr.optional(),
    /**
     * Require N consecutive truthy `breakOn` results before stopping.
     * Default 1 (stop immediately). Raise it to tolerate transient empties.
     */
    breakOnConsecutive: z.number().int().min(1).max(20).default(1),
  })
  .refine((s) => s.breakOn === undefined || s.concurrency === 1, {
    message: 'forEach.breakOn requires concurrency: 1 (sequential execution)',
    path: ['concurrency'],
  })

export const zStep = z.discriminatedUnion('type', [
  zHttpStep,
  zAssignStep,
  zForEachStep,
])
export type Step = z.infer<typeof zStep>

const zPipeline = z.object({
  /** Per-call input names the engine validates at run time. */
  inputs: z.array(z.string()).default([]),
  steps: z.array(zStep).min(1),
  /** Final JSONata expression against the post-run context. */
  output: zExpr,
})
export type Pipeline = z.infer<typeof zPipeline>

// Variants let a single logical pipeline pick between branches based on a
// `when` predicate against the initial inputs (e.g. Bilibili XML vs protobuf
// danmaku). Provider identity stays the same across variants.
const zVariantPipeline = zPipeline.extend({
  /** Truthy `when` selects the variant; first match wins. Omit for default. */
  when: zExpr.optional(),
})
export type VariantPipeline = z.infer<typeof zVariantPipeline>

// Pipeline fields accept either a single Pipeline or an array of variants;
// both normalize to VariantPipeline[] on parse.
const zPipelineField = z
  .union([zPipeline, z.array(zVariantPipeline).min(1)])
  .transform((v): VariantPipeline[] => (Array.isArray(v) ? v : [v]))

// API versions the engine understands. Bumps only on incompatible changes
// (helper removal, step-type semantics). Additive changes don't bump.
export const SUPPORTED_API_VERSIONS = new Set<number>([1])

// `configSchema` follows JSON Schema (draft 2020-12 subset). The engine
// validates structural fields it consumes — type, properties, default,
// required — and passes the rest through for downstream consumers (form
// renderers using rjsf, AJV validators, IDE tooling).
type JsonSchemaShape = {
  type?:
    | 'object'
    | 'string'
    | 'number'
    | 'integer'
    | 'boolean'
    | 'array'
    | 'null'
  title?: string
  description?: string
  default?: unknown
  format?: string
  enum?: unknown[]
  properties?: Record<string, JsonSchemaShape>
  items?: JsonSchemaShape
  required?: string[]
  [k: string]: unknown
}
export const zConfigSchema: z.ZodType<JsonSchemaShape> = z.lazy(() =>
  z
    .object({
      type: z
        .enum([
          'object',
          'string',
          'number',
          'integer',
          'boolean',
          'array',
          'null',
        ])
        .optional(),
      title: z.string().optional(),
      description: z.string().optional(),
      default: z.unknown().optional(),
      format: z.string().optional(),
      enum: z.array(z.unknown()).optional(),
      properties: z.record(z.string(), zConfigSchema).optional(),
      items: zConfigSchema.optional(),
      required: z.array(z.string()).optional(),
    })
    .passthrough()
)
export type ConfigSchema = z.infer<typeof zConfigSchema>

export const zManifest = z.object({
  /** Engine API version; load fails if not in SUPPORTED_API_VERSIONS. */
  apiVersion: z
    .number()
    .int()
    .positive()
    .refine((v) => SUPPORTED_API_VERSIONS.has(v), {
      message: 'unsupported apiVersion',
    }),
  /** Stable id — becomes the providerConfigId in stored records. */
  id: z.string().regex(/^[a-z][a-z0-9_:.\-]*$/i),
  name: z.string(),
  /** Manifest version for the registry / debug. Not enforced by the engine. */
  version: z.string(),
  /**
   * Allowed request hosts. Plain hostnames, `*.example.com` wildcards, or
   * the literal `*` (any host — for DDP-Compat templates where the user
   * supplies the host at install).
   */
  hosts: z.array(z.string()).min(1),
  /** Per-installation options the user sets; merged into pipeline context at run time. */
  configSchema: zConfigSchema.optional(),
  /**
   * Patterns for the host's "which source handles this URL" resolver.
   * Each entry: URL host matches `host` (exact / `*.domain`) AND pathname
   * matches the `path` regex.
   */
  urlMatch: z
    .array(z.object({ host: z.string(), path: z.string() }))
    .default([]),
  /** Inline `.proto` text keyed by name; referenced via request.protoSchema. */
  protoSchemas: z.record(z.string(), z.string()).default({}),
  /** A manifest replacing a built-in source must implement all three pipelines. */
  search: zPipelineField.optional(),
  episodes: zPipelineField.optional(),
  danmaku: zPipelineField.optional(),
  /** Re-fetch a stored season's metadata. Inputs are the season's providerIds. */
  season: zPipelineField.optional(),
  /**
   * Resolve a URL to a `{ seasonInsert, episodeMeta }` pair. Named capture
   * groups from the first matching `urlMatch` entry become pipeline inputs
   * (e.g. `path: '/play/ss(?<ssid>\\d+)'` → input `ssid` available in the
   * pipeline context).
   */
  parseUrl: zPipelineField.optional(),
  /**
   * Probe whether the user's stored session/cookies grant a valid session
   * at this source. Output shape is source-specific (user-info object,
   * boolean, etc.); the host inspects it per provider.
   */
  loginProbe: zPipelineField.optional(),
  /**
   * Declarative login action: opening (or fetching) `url` is expected to
   * persist session cookies for this source. The host renders a button
   * surfaced when the user wants to authenticate; presence of this field
   * is what makes that button appear.
   */
  cookieSet: z
    .object({
      url: z.url(),
      title: z.string().optional(),
    })
    .optional(),
})
export type Manifest = z.infer<typeof zManifest>
