import type { UniChunk } from '@dan-uni/dan-any/core'
import { inject, injectable } from 'inversify'
import type { StoredChunk } from '@/common/db/db'
import { DanmakuAnywhereDb } from '@/common/db/db'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import { invariant, isServiceWorker } from '@/common/utils/utils'

/**
 * ChunkService manages the storage and retrieval of UniChunk data.
 *
 * Chunks are stored by saving UDanmaku arrays in IndexedDB.
 * When loading, we recreate the chunk and import the data.
 */
@injectable('Singleton')
export class ChunkService {
  private logger: ILogger

  constructor(
    @inject(DanmakuAnywhereDb) private db: DanmakuAnywhereDb,
    @inject(LoggerSymbol) logger: ILogger
  ) {
    invariant(
      isServiceWorker(),
      'ChunkService is only available in service worker'
    )
    this.logger = logger.sub('[ChunkService]')
  }

  /**
   * Store a UniChunk and return its ID
   */
  async saveChunk(chunk: UniChunk): Promise<number> {
    const now = Date.now()

    // Get all danmakus from the chunk (UDanmaku[])
    const danmakus = await chunk.$danmakus

    const chunkRecord: Omit<StoredChunk, 'id'> = {
      data: danmakus, // Store UDanmaku array directly
      createdAt: now,
      updatedAt: now,
    }

    const id = await this.db.chunks.add(chunkRecord)
    this.logger.debug('Saved chunk', id, 'with', danmakus.length, 'danmakus')
    return id
  }

  /**
   * Update an existing chunk
   */
  async updateChunk(chunkId: number, chunk: UniChunk): Promise<void> {
    const danmakus = await chunk.$danmakus

    await this.db.chunks.update(chunkId, {
      data: danmakus,
      updatedAt: Date.now(),
    })

    this.logger.debug('Updated chunk', chunkId)
  }

  /**
   * Delete a chunk
   */
  async deleteChunk(chunkId: number): Promise<void> {
    await this.db.chunks.delete(chunkId)
    this.logger.debug('Deleted chunk', chunkId)
  }

  /**
   * Get chunk count for statistics
   */
  async getChunkCount(): Promise<number> {
    return this.db.chunks.count()
  }

  /**
   * Get chunk data directly without loading into UniChunk
   * Used for RPC to avoid `document is not defined` errors in service worker
   */
  async getChunkData(chunkId: number) {
    const record = await this.db.chunks.get(chunkId)

    if (!record || !Array.isArray(record.data)) {
      return null
    }

    return record.data
  }
}
