import { Injectable, inject } from '@angular/core'
import { injectQuery } from '@tanstack/angular-query-experimental'
import { lastValueFrom } from 'rxjs'
import { ExtensionMessagingService } from '../extension/extension-messaging.service'

@Injectable({
  providedIn: 'root',
})
export class DanmakuService {
  private readonly extensionMessagingService = inject(ExtensionMessagingService)

  readonly episodesQuery = injectQuery(() => ({
    queryKey: ['episodes'],
    queryFn: () => this.getEpisodes(),
  }))

  private getEpisodes() {
    return lastValueFrom(
      this.extensionMessagingService.single('episodeGetAll', undefined)
    )
  }
}
