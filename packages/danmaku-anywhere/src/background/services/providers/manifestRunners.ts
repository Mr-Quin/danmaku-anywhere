import {
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

/**
 * Pre-compiled `protobuf.Type` overrides for manifests that need them.
 * MV3 service workers block `unsafe-eval`, so the engine can't compile
 * inline `.proto` text at runtime (protobufjs's lazy codegen triggers
 * `new Function`). Static-generated types bypass that.
 *
 * DA-474 plans to migrate to `@bufbuild/protobuf` so the manifest can
 * carry a CSP-safe binary descriptor and drop these registrations.
 */
const bilibiliProtoTypes: ProtoTypeOverrides = {
  bili: {
    'dm.v1.DmSegMobileReply':
      bilibiliProto.community.service.dm.v1.DmSegMobileReply,
    'dm.v1.DanmakuElem': bilibiliProto.community.service.dm.v1.DanmakuElem,
  },
}

type RunnerKey = 'ddp' | 'ddpCompat' | 'bilibili' | 'tencent'

const manifestSpecs: Record<
  RunnerKey,
  { manifest: unknown; protoTypes?: ProtoTypeOverrides }
> = {
  ddp: { manifest: builtinDandanplay },
  ddpCompat: { manifest: builtinDdpCompat },
  bilibili: { manifest: builtinBilibili, protoTypes: bilibiliProtoTypes },
  tencent: { manifest: builtinTencent },
}

// `ManifestRunner` parses the manifest and builds a `ProtoRegistry` on
// construction. Cache one per shipped manifest so the per-call service
// factory doesn't re-parse the JSON on every search.
const runners = new Map<RunnerKey, ManifestRunner>()

function getRunner(key: RunnerKey): ManifestRunner {
  let runner = runners.get(key)
  if (!runner) {
    const { manifest, protoTypes } = manifestSpecs[key]
    runner = new ManifestRunner(zManifest.parse(manifest), {
      fetcher: extensionFetchLike,
      protoTypes,
    })
    runners.set(key, runner)
  }
  return runner
}

export function getDdpRunner(): ManifestRunner {
  return getRunner('ddp')
}

export function getDdpCompatRunner(): ManifestRunner {
  return getRunner('ddpCompat')
}

export function getBilibiliRunner(): ManifestRunner {
  return getRunner('bilibili')
}

export function getTencentRunner(): ManifestRunner {
  return getRunner('tencent')
}
