import protobuf from 'protobufjs'

/**
 * Per-schema-name compiled root. The engine maintains one registry per
 * ManifestRunner (or shared, if a host wants to dedupe across runners).
 *
 * Manifests carry `.proto` text inline under `protoSchemas`. The first time
 * a request uses `format: 'proto'` with a given schema name, the text is
 * compiled and cached. Subsequent uses skip the parse.
 */
export class ProtoRegistry {
  private compiled = new Map<string, protobuf.Root>()
  private readonly schemas: Record<string, string>
  private readonly maxSchemaBytes: number

  constructor(
    schemas: Record<string, string>,
    opts: { maxSchemaBytes?: number } = {}
  ) {
    this.schemas = schemas
    this.maxSchemaBytes = opts.maxSchemaBytes ?? 64 * 1024
  }

  /**
   * Resolve a (schema, message) reference to a protobufjs Type. Compiles
   * the schema lazily; throws if the schema name is unknown or the type
   * path isn't in the schema.
   */
  lookupType(schemaName: string, messageName: string): protobuf.Type {
    let root = this.compiled.get(schemaName)
    if (root === undefined) {
      const source = this.schemas[schemaName]
      if (source === undefined) {
        throw new Error(`unknown protoSchema "${schemaName}"`)
      }
      if (source.length > this.maxSchemaBytes) {
        throw new Error(
          `protoSchema "${schemaName}" exceeds ${this.maxSchemaBytes} chars`
        )
      }
      const parsed = protobuf.parse(source, { keepCase: true })
      root = parsed.root
      this.compiled.set(schemaName, root)
    }
    return root.lookupType(messageName)
  }

  /**
   * Decode a bytes payload into a plain object using the named schema/type.
   * The output is JSON-friendly and ready to feed into JSONata extract.
   */
  decode(
    schemaName: string,
    messageName: string,
    bytes: Uint8Array
  ): Record<string, unknown> {
    const type = this.lookupType(schemaName, messageName)
    const message = type.decode(bytes)
    /**
     * `toObject` with `defaults: true` ensures absent fields surface as
     * their type defaults rather than undefined, which keeps JSONata
     * predicates predictable. `longs: String` keeps int64 values safe to
     * compare/render — JS numbers can't hold them losslessly.
     */
    return type.toObject(message, {
      defaults: true,
      longs: String,
      enums: String,
      bytes: String,
    })
  }
}
