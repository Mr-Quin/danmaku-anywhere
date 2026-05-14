// Dev API registry. The dev API exposes typed introspection + dispatch over
// the extension's internal services for tests, dev tooling, and agentic
// interactions. Production builds DCE this entire module via the
// VITE_DA_ENV !== 'prod' import boundary in src/background/index.ts.

export type MethodKind = 'read' | 'write'

export type DaEnv = 'dev' | 'preview' | 'prod'

export interface ArgSpec {
  name: string
  // Human-readable type label for describe() output. Not a TypeScript type.
  type: string
  optional?: boolean
}

export interface MethodDef<
  // Args and Ret are specific at the defineMethod() call site. The registry
  // erases them to AnyMethodDef when storing in a namespace's methods array,
  // since dispatch is uniform across method shapes.
  // biome-ignore lint/suspicious/noExplicitAny: variance helper
  Args extends readonly any[] = readonly unknown[],
  Ret = unknown,
> {
  name: string
  description?: string
  kind: MethodKind
  args?: readonly ArgSpec[]
  handler: (...args: Args) => Ret | Promise<Ret>
}

// Type-erased MethodDef for storage in namespace methods arrays. Used
// internally by buildRegistry() and as the array element type on DevNamespace.
// biome-ignore lint/suspicious/noExplicitAny: variance helper
export type AnyMethodDef = MethodDef<any[], any>

export function defineMethod<A extends readonly unknown[], R>(
  def: MethodDef<A, R>
): AnyMethodDef {
  return def as AnyMethodDef
}

export interface DevNamespace {
  readonly name: string
  readonly description?: string
  readonly methods: readonly AnyMethodDef[]
}

export interface MethodDescription {
  name: string
  description?: string
  kind: MethodKind
  args: ArgSpec[]
}

export interface NamespaceDescription {
  name: string
  description?: string
  methods: MethodDescription[]
}

export interface Registry {
  describe(): NamespaceDescription[]
  dispatch(namespace: string, method: string, args: unknown[]): Promise<unknown>
  // Two-level Proxy attached to globalThis.__da. All access funnels through
  // dispatch() so env-gating, validation, and future telemetry all happen in
  // one place.
  readonly proxy: unknown
}

export class DevApiError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DevApiError'
  }
}

interface CompiledMethod {
  def: AnyMethodDef
  // True when the method should be filtered out for the current env.
  filtered: boolean
}

interface CompiledNamespace {
  name: string
  description?: string
  methods: Map<string, CompiledMethod>
}

function compile(
  namespaces: readonly DevNamespace[],
  env: DaEnv
): Map<string, CompiledNamespace> {
  const out = new Map<string, CompiledNamespace>()
  for (const ns of namespaces) {
    if (out.has(ns.name)) {
      throw new DevApiError(`Duplicate namespace: ${ns.name}`)
    }
    const methods = new Map<string, CompiledMethod>()
    for (const m of ns.methods) {
      if (methods.has(m.name)) {
        throw new DevApiError(`Duplicate method: ${ns.name}.${m.name}`)
      }
      // Preview gating: only reads are exposed.
      const filtered = env === 'preview' && m.kind === 'write'
      methods.set(m.name, { def: m, filtered })
    }
    out.set(ns.name, {
      name: ns.name,
      description: ns.description,
      methods,
    })
  }
  return out
}

// Top-level methods exposed directly on __da (alongside namespace access).
// describe() returns the API tree; help() is an alias for human callers.
type TopLevelKey = 'describe' | 'help'

function makeProxy(
  dispatch: Registry['dispatch'],
  describe: () => NamespaceDescription[],
  compiled: Map<string, CompiledNamespace>
): unknown {
  const topLevel: Record<TopLevelKey, unknown> = {
    describe: () => describe(),
    help: () => describe(),
  }
  // Outer Proxy: namespace access OR top-level method. Returns an inner Proxy
  // whose function-call trap dispatches. Unknown keys throw a typed error so
  // callers get a clear failure mode.
  return new Proxy(Object.create(null), {
    get(_t, key: string | symbol) {
      if (typeof key !== 'string') {
        return undefined
      }
      if (key in topLevel) {
        return topLevel[key as TopLevelKey]
      }
      const ns = compiled.get(key)
      if (!ns) {
        throw new DevApiError(
          `Unknown dev API namespace: '${key}'. Available: describe, help, ${[...compiled.keys()].join(', ')}`
        )
      }
      return new Proxy(Object.create(null), {
        get(_t2, methodKey: string | symbol) {
          if (typeof methodKey !== 'string') {
            return undefined
          }
          const m = ns.methods.get(methodKey)
          if (!m) {
            throw new DevApiError(
              `Unknown dev API method: '${ns.name}.${String(methodKey)}'. Available: ${[
                ...ns.methods.keys(),
              ].join(', ')}`
            )
          }
          return (...args: unknown[]) => dispatch(ns.name, methodKey, args)
        },
      })
    },
  })
}

export function buildRegistry(
  namespaces: readonly DevNamespace[],
  options: { env: DaEnv }
): Registry {
  const compiled = compile(namespaces, options.env)

  const dispatch: Registry['dispatch'] = async (nsName, methodName, args) => {
    const ns = compiled.get(nsName)
    if (!ns) {
      throw new DevApiError(`Unknown namespace: ${nsName}`)
    }
    const m = ns.methods.get(methodName)
    if (!m) {
      throw new DevApiError(`Unknown method: ${nsName}.${methodName}`)
    }
    if (m.filtered) {
      throw new DevApiError(
        `${nsName}.${methodName} is gated out by env=${options.env} (kind=${m.def.kind})`
      )
    }
    return await m.def.handler(...args)
  }

  const describe: Registry['describe'] = () => {
    const out: NamespaceDescription[] = []
    for (const ns of compiled.values()) {
      const methods: MethodDescription[] = []
      for (const m of ns.methods.values()) {
        if (m.filtered) {
          continue
        }
        methods.push({
          name: m.def.name,
          description: m.def.description,
          kind: m.def.kind,
          args: m.def.args ? [...m.def.args] : [],
        })
      }
      out.push({
        name: ns.name,
        description: ns.description,
        methods,
      })
    }
    return out
  }

  return {
    describe,
    dispatch,
    proxy: makeProxy(dispatch, describe, compiled),
  }
}
