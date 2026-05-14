export type MethodKind = 'read' | 'write'

export type DaEnv = 'dev' | 'preview' | 'prod'

export interface ArgSpec {
  name: string
  // Human-readable type label for describe() output. Not a TypeScript type.
  type: string
  optional?: boolean
}

export interface MethodDef<
  // biome-ignore lint/suspicious/noExplicitAny: variance helper for AnyMethodDef
  Args extends readonly any[] = readonly unknown[],
  Ret = unknown,
> {
  name: string
  description?: string
  kind: MethodKind
  args?: readonly ArgSpec[]
  handler: (...args: Args) => Ret | Promise<Ret>
}

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
  // Two-level Proxy attached to globalThis.__da. All callable access funnels
  // through dispatch() so env-gating and validation share a single path.
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
      // preview env exposes reads only
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

type TopLevelKey = 'describe' | 'help'

// Keys returned undefined without throwing, so `console.log(__da)`,
// `await __da` thenable probing, JSON.stringify, jest matchers, and React
// devtools don't trip the unknown-namespace error path.
const SILENT_KEYS = new Set<string | symbol>([
  'then',
  'toJSON',
  'toString',
  'valueOf',
  'constructor',
  'asymmetricMatch',
  '$$typeof',
  Symbol.toPrimitive,
  Symbol.toStringTag,
  Symbol.iterator,
  Symbol.asyncIterator,
])

function makeProxy(
  dispatch: Registry['dispatch'],
  describe: () => NamespaceDescription[],
  compiled: Map<string, CompiledNamespace>
): unknown {
  // null-prototype so Object.hasOwn is authoritative — `key in topLevel`
  // would also match Object.prototype.toString etc.
  const topLevel: Record<TopLevelKey, unknown> = Object.assign(
    Object.create(null),
    {
      describe: () => describe(),
      help: () => describe(),
    }
  )
  return new Proxy(Object.create(null), {
    get(_t, key: string | symbol) {
      if (SILENT_KEYS.has(key)) {
        return undefined
      }
      if (typeof key !== 'string') {
        return undefined
      }
      if (Object.hasOwn(topLevel, key)) {
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
          if (SILENT_KEYS.has(methodKey)) {
            return undefined
          }
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
