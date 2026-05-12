import protobuf from 'protobufjs'

/**
 * Lazy-compiled cache of inline `.proto` schemas a manifest carries under
 * `protoSchemas`. Compile on first use, reuse compiled `Root` after.
 */
export class ProtoRegistry {
  private compiled = new Map<string, protobuf.Root>()
  private readonly schemas: Record<string, string>

  constructor(schemas: Record<string, string>) {
    this.schemas = schemas
  }

  lookupType(schemaName: string, messageName: string): protobuf.Type {
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
