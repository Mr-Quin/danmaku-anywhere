import { ManifestRunner, zManifest } from '@danmaku-anywhere/dango'
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
import { extensionFetchLike } from './extensionFetchLike'

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
