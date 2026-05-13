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
 * Pre-compiled `protobuf.Type` overrides registered against the manifests
 * that need them. MV3 service workers block `unsafe-eval`, so the engine
 * can't parse `manifest.protoSchemas`'s inline `.proto` text at runtime
 * (`protobufjs`'s lazy codegen for Type.ctor/decode/toObject triggers
 * `new Function`). Static-generated types replace those lazy properties
 * with hand-rolled implementations that don't use eval.
 *
 * Adding a new protobuf-using manifest requires extending this map. See
 * DA-474 for the longer-term plan to move to `@bufbuild/protobuf`, which
 * would let the manifest carry a CSP-safe binary descriptor and avoid
 * the explicit registration step here.
 */
const bilibiliProtoTypes: ProtoTypeOverrides = {
  bili: {
    'dm.v1.DmSegMobileReply':
      bilibiliProto.community.service.dm.v1.DmSegMobileReply,
    'dm.v1.DanmakuElem': bilibiliProto.community.service.dm.v1.DanmakuElem,
  },
}

/**
 * `ManifestRunner` parses the manifest and builds a `ProtoRegistry` at
 * construction. That's not free, so we lazily build one per shipped manifest
 * and reuse it across calls. The factory creates per-call `*Service`
 * instances, so without caching here every search would re-parse the JSON.
 */

let ddpRunner: ManifestRunner | null = null
let ddpCompatRunner: ManifestRunner | null = null
let bilibiliRunner: ManifestRunner | null = null
let tencentRunner: ManifestRunner | null = null

export function getDdpRunner(): ManifestRunner {
  if (!ddpRunner) {
    ddpRunner = new ManifestRunner(zManifest.parse(builtinDandanplay), {
      fetcher: extensionFetchLike,
    })
  }
  return ddpRunner
}

export function getDdpCompatRunner(): ManifestRunner {
  if (!ddpCompatRunner) {
    ddpCompatRunner = new ManifestRunner(zManifest.parse(builtinDdpCompat), {
      fetcher: extensionFetchLike,
    })
  }
  return ddpCompatRunner
}

export function getBilibiliRunner(): ManifestRunner {
  if (!bilibiliRunner) {
    bilibiliRunner = new ManifestRunner(zManifest.parse(builtinBilibili), {
      fetcher: extensionFetchLike,
      protoTypes: bilibiliProtoTypes,
    })
  }
  return bilibiliRunner
}

export function getTencentRunner(): ManifestRunner {
  if (!tencentRunner) {
    tencentRunner = new ManifestRunner(zManifest.parse(builtinTencent), {
      fetcher: extensionFetchLike,
    })
  }
  return tencentRunner
}
