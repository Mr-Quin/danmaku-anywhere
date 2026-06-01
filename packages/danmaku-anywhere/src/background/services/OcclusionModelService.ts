import { inject, injectable } from 'inversify'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import type { ModelManagementState } from '@/common/models/dto'
import { ModelManifestService } from '@/common/models/ModelManifestService'
import { type ModelEntry, modelDownloadUrl } from '@/common/models/schema'
import { RpcException } from '@/common/rpc/types'
import {
  fetchAndCacheFile,
  listCachedFiles,
  removeCachedFile,
} from '@/common/storage/opfsFileCache'

/**
 * Background-side model management. The background worker shares one
 * unpartitioned extension-origin OPFS root with the segmenter iframe, so this is
 * the one context that can enumerate, download, and evict exactly the model
 * files the iframe reads. The popup and floating panel drive it over RPC.
 */
@injectable('Singleton')
export class OcclusionModelService {
  private readonly logger: ILogger
  // Coalesces repeated download requests for the same id (e.g. reopening the
  // popup mid-download) so they share one fetch instead of racing OPFS writes.
  private readonly inFlightDownloads = new Map<
    string,
    Promise<ModelManagementState>
  >()

  constructor(
    @inject(ModelManifestService)
    private readonly manifest: ModelManifestService,
    @inject(LoggerSymbol) logger: ILogger
  ) {
    this.logger = logger.sub('[OcclusionModelService]')
  }

  async getState(): Promise<ModelManagementState> {
    const [models, storage] = await Promise.all([
      this.manifest.listModels(),
      listCachedFiles(),
    ])
    return { models, storage }
  }

  async refresh(): Promise<ModelManagementState> {
    await this.manifest.refresh()
    return this.getState()
  }

  resolveModel(id: string): Promise<ModelEntry> {
    return this.manifest.resolveModel(id)
  }

  download(id: string): Promise<ModelManagementState> {
    const existing = this.inFlightDownloads.get(id)
    if (existing) {
      return existing
    }
    const promise = this.runDownload(id).finally(() => {
      this.inFlightDownloads.delete(id)
    })
    this.inFlightDownloads.set(id, promise)
    return promise
  }

  private async runDownload(id: string): Promise<ModelManagementState> {
    const model = await this.manifest.getModel(id)
    const url = model && modelDownloadUrl(model)
    if (!model || model.delivery !== 'hosted' || !url) {
      throw new RpcException(`model "${id}" is not a downloadable hosted model`)
    }
    this.logger.debug(`downloading model "${id}"`)
    await fetchAndCacheFile({ id: model.id, url, sha256: model.sha256 })
    return this.getState()
  }

  async delete(id: string): Promise<ModelManagementState> {
    await removeCachedFile(id)
    return this.getState()
  }
}
