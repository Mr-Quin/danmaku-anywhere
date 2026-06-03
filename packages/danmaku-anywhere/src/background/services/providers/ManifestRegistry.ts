import { ManifestRunner, zManifest } from '@mr-quin/dango'
import builtinBilibili from '@mr-quin/dango-manifests/manifests/builtin-bilibili.json' with {
  type: 'json',
}
import builtinDandanplay from '@mr-quin/dango-manifests/manifests/builtin-dandanplay.json' with {
  type: 'json',
}
import builtinTencent from '@mr-quin/dango-manifests/manifests/builtin-tencent.json' with {
  type: 'json',
}
import { inject, injectable } from 'inversify'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import { extensionFetchLike } from './extensionFetchLike'

const builtinManifests: unknown[] = [
  builtinDandanplay,
  builtinBilibili,
  builtinTencent,
]

@injectable('Singleton')
export class ManifestRegistry {
  private readonly runners = new Map<string, ManifestRunner>()

  constructor(@inject(LoggerSymbol) logger: ILogger) {
    const log = logger.sub('[ManifestRegistry]')
    for (const manifest of builtinManifests) {
      // Per-manifest so one bad spec doesn't take the registry down.
      const parsed = zManifest.safeParse(manifest)
      if (!parsed.success) {
        log.error(
          'Failed to load built-in manifest:',
          (manifest as { id?: string }).id ?? '<unknown>',
          parsed.error.issues
        )
        continue
      }
      const runner = new ManifestRunner(parsed.data, {
        fetcher: extensionFetchLike,
      })
      this.runners.set(parsed.data.id, runner)
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
