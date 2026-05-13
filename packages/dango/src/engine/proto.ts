import protobuf from 'protobufjs'

/**
 * Lazy-compiled cache of inline `.proto` schemas a manifest carries under
 * `protoSchemas`. Compile on first use, reuse compiled `Root` after.
 *
 * Decoding walks the parsed schema reflectively using `protobuf.Reader` for
 * wire-format I/O — we intentionally avoid `Type.prototype.decode`, which
 * lazily generates a decoder via `new Function()` (blocked by the MV3
 * service-worker CSP). `protobuf.parse()` itself doesn't use eval; only
 * `Type.decode` triggers codegen, and we never call it.
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
   * Decode bytes to a JSONata-friendly plain object. Matches what the legacy
   * `type.toObject(type.decode(bytes), { defaults: true, longs: String,
   * enums: String, bytes: String })` call used to produce:
   *  - absent fields surface as type defaults (predictable JSONata predicates)
   *  - int64/uint64/etc. become decimal strings (JS Number can't carry them)
   *  - enums become their value name
   *  - bytes become base64 strings
   */
  decode(
    schemaName: string,
    messageName: string,
    bytes: Uint8Array
  ): Record<string, unknown> {
    const type = this.lookupType(schemaName, messageName)
    const reader = protobuf.Reader.create(bytes)
    return decodeMessage(type, reader, reader.len)
  }
}

/**
 * Walk a protobuf message reflectively. Pure reads via `protobuf.Reader`; no
 * code generation, no `new Function()`. Output mirrors protobufjs's
 * `toObject({ defaults: true, longs: String, enums: String, bytes: String })`
 * so manifests that previously used the codegen path keep working.
 */
function decodeMessage(
  type: protobuf.Type,
  reader: protobuf.Reader,
  endPos: number
): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const field of type.fieldsArray) {
    field.resolve()
    if (field.map) {
      result[field.name] = {}
    } else if (field.repeated) {
      result[field.name] = []
    } else {
      result[field.name] = defaultValue(field)
    }
  }

  while (reader.pos < endPos) {
    const tag = reader.uint32()
    const fieldNumber = tag >>> 3
    const wireType = tag & 7
    const field = type.fieldsById[fieldNumber]

    if (!field) {
      reader.skipType(wireType)
      continue
    }
    field.resolve()

    // Packed repeated: a single length-delimited blob containing the
    // packed scalar values. proto3 makes repeated scalars packed by default.
    if (field.repeated && wireType === 2 && isPackable(field.type)) {
      const len = reader.uint32()
      const end = reader.pos + len
      const arr = result[field.name] as unknown[]
      while (reader.pos < end) {
        arr.push(readScalar(reader, field))
      }
      continue
    }

    let value: unknown
    if (
      field.resolvedType &&
      (field.resolvedType as protobuf.Type).fieldsArray
    ) {
      // Nested message
      const len = reader.uint32()
      const innerEnd = reader.pos + len
      value = decodeMessage(
        field.resolvedType as protobuf.Type,
        reader,
        innerEnd
      )
    } else if (
      field.resolvedType &&
      (field.resolvedType as protobuf.Enum).valuesById
    ) {
      // Enum — read as int32 varint, output by name (matches enums: String)
      const v = reader.int32()
      const name = (field.resolvedType as protobuf.Enum).valuesById[v]
      value = name ?? v
    } else {
      value = readScalar(reader, field)
    }

    if (field.repeated) {
      ;(result[field.name] as unknown[]).push(value)
    } else {
      result[field.name] = value
    }
  }

  return result
}

function readScalar(reader: protobuf.Reader, field: protobuf.Field): unknown {
  switch (field.type) {
    case 'int32':
      return reader.int32()
    case 'uint32':
      return reader.uint32()
    case 'sint32':
      return reader.sint32()
    case 'int64':
      return reader.int64().toString()
    case 'uint64':
      return reader.uint64().toString()
    case 'sint64':
      return reader.sint64().toString()
    case 'fixed32':
      return reader.fixed32()
    case 'sfixed32':
      return reader.sfixed32()
    case 'fixed64':
      return reader.fixed64().toString()
    case 'sfixed64':
      return reader.sfixed64().toString()
    case 'float':
      return reader.float()
    case 'double':
      return reader.double()
    case 'bool':
      return reader.bool()
    case 'string':
      return reader.string()
    case 'bytes':
      // toObject({bytes: String}) returns base64
      return uint8ToBase64(reader.bytes())
    default:
      throw new Error(`unsupported protobuf scalar type: ${field.type}`)
  }
}

function isPackable(type: string): boolean {
  switch (type) {
    case 'int32':
    case 'uint32':
    case 'sint32':
    case 'int64':
    case 'uint64':
    case 'sint64':
    case 'fixed32':
    case 'sfixed32':
    case 'fixed64':
    case 'sfixed64':
    case 'float':
    case 'double':
    case 'bool':
      return true
    default:
      return false
  }
}

function defaultValue(field: protobuf.Field): unknown {
  if (field.resolvedType && (field.resolvedType as protobuf.Type).fieldsArray) {
    return null
  }
  if (field.resolvedType && (field.resolvedType as protobuf.Enum).valuesById) {
    const e = field.resolvedType as protobuf.Enum
    return e.valuesById[0] ?? 0
  }
  switch (field.type) {
    case 'int32':
    case 'uint32':
    case 'sint32':
    case 'fixed32':
    case 'sfixed32':
    case 'float':
    case 'double':
      return 0
    case 'int64':
    case 'uint64':
    case 'sint64':
    case 'fixed64':
    case 'sfixed64':
      return '0'
    case 'bool':
      return false
    case 'string':
      return ''
    case 'bytes':
      return ''
    default:
      return null
  }
}

function uint8ToBase64(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) {
    bin += String.fromCharCode(b)
  }
  return btoa(bin)
}
