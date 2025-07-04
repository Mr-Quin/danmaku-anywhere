import { Injectable, inject } from '@angular/core'
import { injectQuery } from '@tanstack/angular-query-experimental'
import { lastValueFrom } from 'rxjs'
import { ExtensionService } from '../extension/extension.service'

@Injectable({
  providedIn: 'root',
})
export class DanmakuService {
  private readonly extensionService = inject(ExtensionService)

  readonly episodesQuery = injectQuery(() => ({
    queryKey: ['episodes'],
    queryFn: () => this.getEpisodes(),
  }))

  private getEpisodes() {
    return lastValueFrom(
      this.extensionService.single('episodeGetAll', undefined)
    )
  }
}
