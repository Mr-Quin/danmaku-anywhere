import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import type {
  CustomEpisodeLite,
  EpisodeLite,
} from '@danmaku-anywhere/danmaku-converter'
import { Button } from 'primeng/button'
import { Popover } from 'primeng/popover'
import { ScrollPanel } from 'primeng/scrollpanel'
import { Toolbar } from 'primeng/toolbar'
import { MaterialIcon } from '../../../shared/components/material-icon'
import { DanmakuService } from '../../danmaku/danmaku.service'

@Component({
  selector: 'da-video-toolbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Toolbar, Button, ScrollPanel, MaterialIcon, Popover],
  template: `
    <p-toolbar>
      <ng-template #start>
        <p-button
          (onClick)="episodePanel.toggle($event)"
          severity="secondary"
          text
        >
          <ng-template #icon>
            <da-mat-icon icon="format_list_bulleted" />
          </ng-template>
        </p-button>
      </ng-template>
    </p-toolbar>

    <p-popover #episodePanel [style]="{ width: '400px', maxHeight: '500px' }">
      <ng-template #content>
        <div>
          <div class="flex items-center justify-between">
            <h3 class="font-semibold text-lg">以下载弹幕</h3>
            <p-button
              (click)="episodePanel.hide()"
              severity="secondary"
              text
            >
              <ng-template #icon>
                <da-mat-icon icon="close" />
              </ng-template>
            </p-button>
          </div>

          @if (danmakuService.episodesQuery.isSuccess()) {
            @let data = danmakuService.episodesQuery.data();

            <p-scrollPanel [style]="{ height: '400px' }">
              @if (data.length === 0) {
                <div class="flex flex-col items-center justify-center p-6">
                  <i class="pi pi-inbox text-2xl text-gray-400 mb-2"></i>
                  <span class="text-gray-500">无弹幕</span>
                </div>
              } @else {
                <div class="flex flex-col gap-2">
                  @for (episode of data; track episode.id) {
                    <div
                      class="p-3 rounded-lg cursor-pointer"
                      (click)="onEpisodeClick(episode)"
                    >
                      <div class="flex items-start justify-between">
                        <div class="flex-1 min-w-0">
                          <h4 class="font-medium text-sm truncate mb-1">{{ episode.title }}</h4>
                          <div class="flex items-center gap-2 text-xs text-gray-500">
                            <span class="px-2 py-1 rounded text-xs">{{ episode.provider }}</span>

                            @if (episode.commentCount > 0) {
                              <span class="flex items-center gap-1">
                                <i class="pi pi-comments"></i>
                                {{ episode.commentCount }}
                              </span>
                            }
                          </div>
                        </div>
                        <i class="pi pi-angle-right text-gray-400 ml-2"></i>
                      </div>
                    </div>
                  }
                </div>
              }
            </p-scrollPanel>
          }
        </div>
      </ng-template>
    </p-popover>
  `,
})
export class VideoToolbar {
  readonly danmakuService = inject(DanmakuService)

  onEpisodeClick(episode: EpisodeLite | CustomEpisodeLite) {
    // noop
  }
}
