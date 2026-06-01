import { inject, injectable } from 'inversify'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import type { ModelManagementState } from '@/common/models/dto'
import { ModelManifestService } from '@/common/models/ModelManifestService'
import type { ModelEntry } from '@/common/models/schema'
import { RpcException } from '@/common/rpc/types'
import { fetchAndCacheFile } from '@/common/storage/opfsFileCache'
import {
  deleteModelFile,
  listModelFiles,
} from '@/common/storage/opfsModelStore'

/**
 * Background-side model management. The background worker shares one
 * unpartitioned extension-origin OPFS root with the segmenter iframe, so this is
 * the one context that can enumerate, download, and evict exactly the model
 * files the iframe reads. The popup and floating panel drive it over RPC.
 */
@injectable('Singleton')
export class OcclusionModelService {
  private readonly logger: ILogger

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
      listModelFiles(),
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

  async download(id: string): Promise<ModelManagementState> {
    const model = await this.manifest.getModel(id)
    if (!model || model.delivery !== 'hosted' || !model.url) {
      throw new RpcException(`model "${id}" is not a downloadable hosted model`)
    }
    const url = model.sha256 ? `${model.url}?v=${model.sha256}` : model.url
    this.logger.debug(`downloading model "${id}"`)
    await fetchAndCacheFile({ id: model.id, url, sha256: model.sha256 })
    return this.getState()
  }

  async delete(id: string): Promise<ModelManagementState> {
    await deleteModelFile(id)
    return this.getState()
  }
}
