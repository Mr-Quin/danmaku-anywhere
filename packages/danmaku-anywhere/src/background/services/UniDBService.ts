import type { InitedUniDB } from '@dan-uni/dan-any/core'
import { UniDB } from '@dan-uni/dan-any/core/main/pure'
import { injectable } from 'inversify'

@injectable('Singleton')
export class UniDBService {
  private udb: InitedUniDB | null = null
  private initPromise: Promise<InitedUniDB> | null = null

  async getUniDB(): Promise<InitedUniDB> {
    if (this.udb) {
      return this.udb
    }

    if (this.initPromise) {
      return this.initPromise
    }

    this.initPromise = this.initialize()
    return this.initPromise
  }

  private async initialize(): Promise<InitedUniDB> {
    const udb = new UniDB()
    this.udb = udb.init()
    return this.udb
  }

  async close(): Promise<void> {
    if (this.udb) {
      await this.udb.close()
      this.udb = null
      this.initPromise = null
    }
  }
}
