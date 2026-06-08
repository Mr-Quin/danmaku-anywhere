import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Config, PublicState } from './types.js'

const CONFIG_FILE = 'config.json'

function defaultConfig(): Config {
  return { builds: [] }
}

export class ConfigStore {
  private readonly configPath: string

  constructor(private readonly dataDir: string) {
    this.configPath = join(dataDir, CONFIG_FILE)
  }

  async load(): Promise<Config> {
    let raw: string
    try {
      raw = await readFile(this.configPath, 'utf8')
    } catch {
      return defaultConfig()
    }

    try {
      const parsed = JSON.parse(raw) as Partial<Config>
      return {
        githubToken: parsed.githubToken,
        activeTag: parsed.activeTag,
        builds: Array.isArray(parsed.builds) ? parsed.builds : [],
      }
    } catch {
      return defaultConfig()
    }
  }

  async save(config: Config): Promise<void> {
    await mkdir(this.dataDir, { recursive: true })
    await writeFile(this.configPath, JSON.stringify(config, null, 2), {
      mode: 0o600,
    })
  }

  toPublicState(config: Config, activePath?: string): PublicState {
    return {
      hasToken: Boolean(config.githubToken),
      activeTag: config.activeTag,
      activePath,
      dataDir: this.dataDir,
      builds: config.builds,
    }
  }
}
