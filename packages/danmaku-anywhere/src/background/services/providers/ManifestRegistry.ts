import {
  type Manifest,
  ManifestRunner,
  type ProtoTypeOverrides,
  zManifest,
} from '@danmaku-anywhere/dango'
import builtinBilibili from '@danmaku-anywhere/dango-manifests/manifests/builtin-bilibili.json' with {
  type: 'json',
}
import builtinDandanplay from '@danmaku-anywhere/dango-manifests/manifests/builtin-dandanplay.json' with {
  type: 'json',
}
import builtinDdpCompat from '@danmaku-anywhere/dango-manifests/manifests/builtin-ddp-compat.json' with {
  type: 'json',
}
import builtinTencent from '@danmaku-anywhere/dango-manifests/manifests/builtin-tencent.json' with {
  type: 'json',
}
import { bilibili as bilibiliProto } from '@danmaku-anywhere/danmaku-provider/bilibili-proto'
import { extensionFetchLike } from './extensionFetchLike'

// MV3 service workers block `unsafe-eval`, so protobufjs's lazy codegen
// can't compile `.proto` text at runtime. Bilibili's manifest references
// pre-compiled types instead. DA-474 plans to migrate to `@bufbuild/protobuf`
// so the manifest can carry a CSP-safe binary descriptor.
const bilibiliProtoTypes: ProtoTypeOverrides = {
  bili: {
    'dm.v1.DmSegMobileReply':
      bilibiliProto.community.service.dm.v1.DmSegMobileReply,
    'dm.v1.DanmakuElem': bilibiliProto.community.service.dm.v1.DanmakuElem,
  },
}

interface ManifestSpec {
  manifest: unknown
  protoTypes?: ProtoTypeOverrides
}

const builtinSpecs: ManifestSpec[] = [
  { manifest: builtinDandanplay },
  { manifest: builtinDdpCompat },
  { manifest: builtinBilibili, protoTypes: bilibiliProtoTypes },
  { manifest: builtinTencent },
]

export class ManifestRegistry {
  private readonly runners = new Map<string, ManifestRunner>()
  private readonly manifests = new Map<string, Manifest>()

  constructor() {
    for (const spec of builtinSpecs) {
      // Per-manifest safeParse so a single malformed manifest (e.g. a
      // breaking schema change against a stale shipped JSON) doesn't take
      // down the whole registry — only its source becomes unavailable.
      const parsed = zManifest.safeParse(spec.manifest)
      if (!parsed.success) {
        console.error(
          'Failed to load built-in manifest:',
          (spec.manifest as { id?: string }).id ?? '<unknown>',
          parsed.error.issues
        )
        continue
      }
      const manifest = parsed.data
      const runner = new ManifestRunner(manifest, {
        fetcher: extensionFetchLike,
        protoTypes: spec.protoTypes,
      })
      this.runners.set(manifest.id, runner)
      this.manifests.set(manifest.id, manifest)
    }
  }

  getRunner(manifestId: string): ManifestRunner {
    const runner = this.runners.get(manifestId)
    if (!runner) {
      throw new Error(`no manifest registered with id: ${manifestId}`)
    }
    return runner
  }

  getManifest(manifestId: string): Manifest {
    const manifest = this.manifests.get(manifestId)
    if (!manifest) {
      throw new Error(`no manifest registered with id: ${manifestId}`)
    }
    return manifest
  }
}

let cached: ManifestRegistry | undefined

export function getManifestRegistry(): ManifestRegistry {
  if (!cached) {
    cached = new ManifestRegistry()
  }
  return cached
}
