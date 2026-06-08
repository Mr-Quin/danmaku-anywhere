import { basename } from 'node:path'
import { err, ok, type Result } from '@danmaku-anywhere/result'
import { activePath, clearActive, setActive } from './active.js'
import { downloadBuild, reconcileBuilds, removeBuild } from './cache.js'
import { fetchReleases } from './github.js'
import { ConfigStore } from './store.js'
import type {
  Config,
  PublicState,
  ReleaseAsset,
  ReleaseManagerError,
} from './types.js'

function validateTag(tag: string): Result<string, ReleaseManagerError> {
  if (
    tag === '' ||
    tag === '.' ||
    tag === '..' ||
    tag.includes('/') ||
    tag.includes('\\') ||
    tag.includes('\0') ||
    basename(tag) !== tag
  ) {
    return err({ kind: 'invalid', message: `unsafe tag: ${tag}` })
  }
  return ok(tag)
}

interface ManagerDeps {
  dataDir: string
  fetchReleases?: (
    token: string | undefined
  ) => Promise<Result<ReleaseAsset[], ReleaseManagerError>>
  downloadAsset?: typeof fetch
}

export class ReleaseManager {
  private readonly dataDir: string
  private readonly store: ConfigStore
  private readonly inFlight = new Set<string>()
  private readonly fetchReleasesImpl: (
    token: string | undefined
  ) => Promise<Result<ReleaseAsset[], ReleaseManagerError>>
  private readonly downloadAsset: typeof fetch

  constructor(deps: ManagerDeps) {
    this.dataDir = deps.dataDir
    this.store = new ConfigStore(deps.dataDir)
    this.fetchReleasesImpl =
      deps.fetchReleases ?? ((token) => fetchReleases(token))
    this.downloadAsset = deps.downloadAsset ?? fetch
  }

  async getState(): Promise<PublicState> {
    const config = await this.store.load()
    const reconciled = await this.reconcileConfig(config)
    const resolvedActive = reconciled.activeTag
      ? activePath(this.dataDir)
      : undefined
    return this.store.toPublicState(reconciled, resolvedActive)
  }

  private async reconcileConfig(config: Config): Promise<Config> {
    const builds = await reconcileBuilds(this.dataDir, config.builds)
    const activeStillPresent = config.activeTag
      ? builds.some((b) => b.tag === config.activeTag)
      : false

    if (
      builds.length === config.builds.length &&
      (!config.activeTag || activeStillPresent)
    ) {
      return config
    }

    if (config.activeTag && !activeStillPresent) {
      await clearActive(this.dataDir)
    }
    const reconciled: Config = {
      ...config,
      builds,
      activeTag: activeStillPresent ? config.activeTag : undefined,
    }
    await this.persist(reconciled)
    return reconciled
  }

  async listReleases(): Promise<Result<ReleaseAsset[], ReleaseManagerError>> {
    const config = await this.store.load()
    return this.fetchReleasesImpl(config.githubToken)
  }

  async downloadBuild(
    tag: string
  ): Promise<Result<PublicState, ReleaseManagerError>> {
    const valid = validateTag(tag)
    if (!valid.success) {
      return valid
    }

    if (this.inFlight.has(tag)) {
      return err({
        kind: 'conflict',
        message: `a download for ${tag} is already running`,
      })
    }
    this.inFlight.add(tag)

    try {
      const config = await this.store.load()
      const releases = await this.fetchReleasesImpl(config.githubToken)
      if (!releases.success) {
        return releases
      }

      const asset = releases.data.find((r) => r.tag === tag)
      if (!asset) {
        return err({ kind: 'not-found', message: `no release tagged ${tag}` })
      }

      const downloaded = await downloadBuild(
        this.dataDir,
        asset,
        this.downloadAsset,
        config.githubToken
      )
      if (!downloaded.success) {
        return downloaded
      }

      const builds = config.builds.filter((b) => b.tag !== tag)
      builds.push(downloaded.data)
      await this.persist({ ...config, builds })

      if (config.activeTag === tag) {
        const refreshed = await setActive(this.dataDir, tag)
        if (!refreshed.success) {
          return refreshed
        }
      }
    } finally {
      this.inFlight.delete(tag)
    }

    return ok(await this.getState())
  }

  async setActive(
    tag: string
  ): Promise<Result<PublicState, ReleaseManagerError>> {
    const valid = validateTag(tag)
    if (!valid.success) {
      return valid
    }

    const config = await this.store.load()
    if (!config.builds.some((b) => b.tag === tag)) {
      return err({ kind: 'not-found', message: `${tag} is not cached` })
    }

    const swapped = await setActive(this.dataDir, tag)
    if (!swapped.success) {
      return swapped
    }

    await this.persist({ ...config, activeTag: tag })
    return ok(await this.getState())
  }

  async removeBuild(
    tag: string
  ): Promise<Result<PublicState, ReleaseManagerError>> {
    const valid = validateTag(tag)
    if (!valid.success) {
      return valid
    }

    const config = await this.store.load()
    if (config.activeTag === tag) {
      return err({
        kind: 'conflict',
        message: `${tag} is active; set another build active before removing it`,
      })
    }

    const removed = await removeBuild(this.dataDir, tag)
    if (!removed.success) {
      return removed
    }

    const builds = config.builds.filter((b) => b.tag !== tag)
    await this.persist({ ...config, builds })
    return ok(await this.getState())
  }

  async updateToken(token: string): Promise<PublicState> {
    const config = await this.store.load()
    const githubToken = token.trim() === '' ? undefined : token
    await this.persist({ ...config, githubToken })
    return this.getState()
  }

  async reconcile(): Promise<void> {
    const config = await this.store.load()
    await this.reconcileConfig(config)
  }

  private async persist(config: Config): Promise<void> {
    await this.store.save(config)
  }
}
