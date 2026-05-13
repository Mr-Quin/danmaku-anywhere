import protobuf from 'protobufjs'

/**
 * Structural subset of `protobuf.Type`'s static surface that the engine
 * actually uses for decoding: `decode(bytes) → message` and
 * `toObject(message, options) → plain object`. This matches both real
 * `protobuf.Type` instances and the function-style "types" emitted by
 * `pbjs --target static-module`, which are not `Type` instances but
 * expose the same two static methods.
 */
export interface DecodableProtoType {
  decode(reader: Uint8Array | protobuf.Reader, length?: number): unknown
  toObject(
    message: unknown,
    options?: protobuf.IConversionOptions
  ): Record<string, unknown>
}

/**
 * Override map keyed by manifest's `protoSchema` name. Each entry is a
 * `messageName → DecodableProtoType` map; the engine prefers these over
 * parsing the manifest's inline `.proto` text. Required for CSP-restricted
 * hosts (MV3 service worker) where `protobufjs`'s runtime codegen
 * (Type.ctor / Type.decode / Type.toObject) violates `unsafe-eval`.
 * Static-generated types from `pbjs --target static-module` replace those
 * lazy properties with hand-rolled implementations and decode without eval.
 */
export type ProtoTypeOverrides = Record<
  string,
  Record<string, DecodableProtoType>
>

/**
 * Lazy-compiled cache of inline `.proto` schemas a manifest carries under
 * `protoSchemas`. Compile on first use, reuse compiled `Root` after. When
 * a `typeOverrides` map is supplied, types are looked up there first —
 * the inline schema is only parsed when no override matches.
 */
export class ProtoRegistry {
  private compiled = new Map<string, protobuf.Root>()
  private readonly schemas: Record<string, string>
  private readonly overrides: Map<string, DecodableProtoType>

  constructor(schemas: Record<string, string>, overrides?: ProtoTypeOverrides) {
    this.schemas = schemas
    this.overrides = new Map()
    if (overrides) {
      for (const [schemaName, types] of Object.entries(overrides)) {
        for (const [messageName, type] of Object.entries(types)) {
          this.overrides.set(`${schemaName}.${messageName}`, type)
        }
      }
    }
  }

  lookupType(schemaName: string, messageName: string): DecodableProtoType {
    const override = this.overrides.get(`${schemaName}.${messageName}`)
    if (override) {
      return override
    }
    let root = this.compiled.get(schemaName)
    if (root === undefined) {
      const source = this.schemas[schemaName]
      if (source === undefined) {
        throw new Error(`unknown protoSchema "${schemaName}"`)
      }
      root = protobuf.parse(source, { keepCase: true }).root
      this.compiled.set(schemaName, root)
    }
    return root.lookupType(messageName)
  }

  /**
   * Decode bytes to a JSONata-friendly plain object. `defaults: true` so
   * absent fields surface as type defaults (predictable predicates);
   * `longs: String` preserves int64 precision JS numbers can't carry.
   */
  decode(
    schemaName: string,
    messageName: string,
    bytes: Uint8Array
  ): Record<string, unknown> {
    const type = this.lookupType(schemaName, messageName)
    return type.toObject(type.decode(bytes), {
      defaults: true,
      longs: String,
      enums: String,
      bytes: String,
    })
  }
}
