import { Injectable, inject } from '@angular/core'
import { injectQuery } from '@tanstack/angular-query-experimental'
import { lastValueFrom } from 'rxjs'
import { ExtensionMessenger } from '../backend/extension-messenger'

@Injectable({
  providedIn: 'root',
})
export class DanmakuService {
  private readonly extensionMessagingService = inject(ExtensionMessenger)

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
