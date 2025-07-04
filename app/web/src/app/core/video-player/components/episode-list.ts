import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import type {
  CustomEpisodeLite,
  EpisodeLite,
} from '@danmaku-anywhere/danmaku-converter'
import { DanmakuService } from '../../danmaku/danmaku.service'

@Component({
  selector: 'da-dropdown-episode-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="episode-list">
      <h3 class="text-lg font-semibold mb-4">Episodes</h3>
      @if (danmakuService.episodesQuery.isPending()) {
        <div class="flex items-center justify-center p-4">
          <span class="text-gray-500">Loading episodes...</span>
        </div>
      } @else if (danmakuService.episodesQuery.isError()) {
        <div class="flex items-center justify-center p-4">
          <span class="text-red-500">Error loading episodes</span>
        </div>
      } @else if (danmakuService.episodesQuery.data()) {
        <div class="grid gap-2">
          @for (episode of danmakuService.episodesQuery.data(); track episode.id) {
            <div
              class="p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
              (click)="onEpisodeClick(episode)"
            >
              <div class="flex items-center justify-between">
                <div class="flex-1">
                  <h4 class="font-medium text-sm truncate">{{ episode.title }}</h4>
                  <p class="text-xs text-gray-400">{{ episode.provider }}</p>
                </div>
                @if (episode.commentCount > 0) {
                  <div class="flex items-center text-xs text-gray-500">
                    <span>{{ episode.commentCount }} comments</span>
                  </div>
                }
              </div>
            </div>
          }
        </div>
      } @else {
        <div class="flex items-center justify-center p-4">
          <span class="text-gray-500">No episodes found</span>
        </div>
      }
    </div>
  `,
})
export class EpisodeList {
  readonly danmakuService = inject(DanmakuService)

  onEpisodeClick(episode: EpisodeLite | CustomEpisodeLite) {
    // noop
  }
}
