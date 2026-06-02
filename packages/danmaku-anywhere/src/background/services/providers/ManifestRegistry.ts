import { bilibili as bilibiliProto } from '@danmaku-anywhere/danmaku-provider/bilibili-proto'
import {
  ManifestRunner,
  type ProtoTypeOverrides,
  zManifest,
} from '@mr-quin/dango'
import builtinBilibili from '@mr-quin/dango-manifests/manifests/builtin-bilibili.json' with {
  type: 'json',
}
import builtinDandanplay from '@mr-quin/dango-manifests/manifests/builtin-dandanplay.json' with {
  type: 'json',
}
import builtinDdpCompat from '@mr-quin/dango-manifests/manifests/builtin-ddp-compat.json' with {
  type: 'json',
}
import builtinTencent from '@mr-quin/dango-manifests/manifests/builtin-tencent.json' with {
  type: 'json',
}
import { inject, injectable } from 'inversify'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import { extensionFetchLike } from './extensionFetchLike'

// MV3 CSP blocks protobufjs's runtime codegen; pre-compiled types are
// referenced here. DA-474 migrates this to @bufbuild/protobuf.
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

@injectable('Singleton')
export class ManifestRegistry {
  private readonly runners = new Map<string, ManifestRunner>()

  constructor(@inject(LoggerSymbol) logger: ILogger) {
    const log = logger.sub('[ManifestRegistry]')
    for (const spec of builtinSpecs) {
      // Per-manifest so one bad spec doesn't take the registry down.
      const parsed = zManifest.safeParse(spec.manifest)
      if (!parsed.success) {
        log.error(
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
    }
  }

  getRunner(manifestId: string): ManifestRunner {
    const runner = this.runners.get(manifestId)
    if (!runner) {
      throw new Error(`no manifest registered with id: ${manifestId}`)
    }
    return runner
  }
}
