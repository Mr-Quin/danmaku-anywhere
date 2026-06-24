import type { InitedUniDB } from '@dan-uni/dan-any/core'
import { UniDB } from '@dan-uni/dan-any/core/main/pure'
import { injectable } from 'inversify'

/**
 * UniDBService manages a singleton UniDB instance for the extension.
 *
 * Uses pure-mode (in-memory) UniDB since we're in a browser extension
 * Service Worker environment where PGLite doesn't work.
 *
 * The UniDB instance is persisted across the service lifecycle and
 * can be serialized/deserialized for backup/restore functionality.
 */
@injectable('Singleton')
export class UniDBService {
  private udb: InitedUniDB | null = null

  async getUniDB(): Promise<InitedUniDB> {
    if (this.udb) {
      return this.udb
    }

    // init() is synchronous in pure mode
    const udb = new UniDB()
    this.udb = udb.init()
    return this.udb
  }

  /**
   * Serialize the UniDB to JSON for backup
   */
  async serialize(): Promise<unknown> {
    if (!this.udb) {
      throw new Error('UniDB not initialized')
    }
    return this.udb.dump()
  }

  /**
   * Deserialize and restore UniDB from JSON
   */
  async deserialize(data: unknown): Promise<void> {
    const udb = new UniDB()
    this.udb = udb.init(data as any)
  }

  async close(): Promise<void> {
    if (this.udb) {
      this.udb.close()
      this.udb = null
    }
  }
}
