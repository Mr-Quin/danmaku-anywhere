import { CommonModule } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  linkedSignal,
  signal,
} from '@angular/core'
import { toObservable } from '@angular/core/rxjs-interop'
import { FormsModule } from '@angular/forms'
import { Router } from '@angular/router'
import { injectQuery } from '@tanstack/angular-query-experimental'
import { Button } from 'primeng/button'
import { Card } from 'primeng/card'
import { Panel } from 'primeng/panel'
import { ProgressSpinner } from 'primeng/progressspinner'
import { ScrollPanel } from 'primeng/scrollpanel'
import { Select } from 'primeng/select'
import { Skeleton } from 'primeng/skeleton'
import { Tag } from 'primeng/tag'
import { EMPTY, finalize, switchMap, tap } from 'rxjs'
import { MaterialIcon } from '../../../shared/components/material-icon'
import { VideoPlayer } from '../../../shared/video-player/video-player'
import { KazumiService } from '../services/kazumi.service'

@Component({
  selector: 'da-kazumi-detail-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    Button,
    Skeleton,
    Tag,
    MaterialIcon,
    FormsModule,
    Select,
    VideoPlayer,
    ScrollPanel,
    ProgressSpinner,
    Card,
    Panel,
  ],
  template: `
    <div class="container mx-auto p-6 2xl:px-0 flex flex-col">
      @let mediaDetails = $searchDetails();
      <div class="mb-10 flex">
        <div class="flex flex-1 items-center gap-2">
          <h1 class="text-2xl font-semibold">{{ mediaDetails.title }}</h1>
          <p-tag [value]="mediaDetails.policy.name" severity="secondary" />
        </div>
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-[1fr_424px] gap-8">
        <da-video-player
          [videoUrl]="$videoUrl()"
          [title]=""
          class="w-full"
        >
          <ng-template #content>
            <div class="size-full flex flex-col justify-center items-center">
              @if (episodesQuery.isPending() || $isVideoUrlLoading()) {
                <p-progress-spinner />
                @if (episodesQuery.isPending()) {
                  正在获取剧集列表
                }
                @if ($isVideoUrlLoading()) {
                  正在获取视频链接
                }
              } @else if (episodesQuery.isError()) {
                <div class="text-center flex flex-col gap-4">
                  <p>获取剧集失败</p>
                  <p>
                    {{ episodesQuery.error() | json }}
                  </p>
                  <p-button
                    (click)="episodesQuery.refetch()"
                    label="重试">
                    <ng-template #icon>
                      <da-mat-icon icon="refresh" />
                    </ng-template>
                  </p-button>

                </div>
              } @else if ($isVideoUrlError()) {
                <div class="text-center flex flex-col gap-4">
                  <p>获取视频链接失败</p>
                </div>
              }
            </div>
          </ng-template>
        </da-video-player>
        <div class="flex flex-col gap-4">
          <p-panel toggler="header" toggleable="true" collapsed="true" styleClass="border-0">
            @let mediaList = media$ | async;
            <ng-template #header>
              <div class="flex items-center gap-2">
                <h3 class="font-bold">资源列表
                  <span>
                      (
                    {{ mediaList?.length ?? 0 }}
                    )
                    </span>
                </h3>
              </div>
            </ng-template>
            @if (mediaList?.length) {
              @for (media of media$ | async; track $index) {
                <p-button class="flex"
                          [styleClass]="media.src === $videoUrl() ? 'border-primary border' : ''"
                          severity="secondary" (onClick)="$videoUrl.set(media.src)">
                  <p-tag [value]="media.contentType" severity="success" />
                  <span class="whitespace-nowrap text-ellipsis overflow-hidden">
                {{ media.src }}
                </span>
                </p-button>
              }
            } @else {
              <p>
                无可用资源
              </p>
            }
          </p-panel>
          <p-card>
            <div class="max-h-72 xl:h-max xl:w-[24rem]">
              @if (episodesQuery.isSuccess() && episodesQuery.data().length > 1) {
                <p-select [options]="$playlistOptions()" [(ngModel)]="$playlistOption" optionLabel="label"
                          class="mb-4" />
              }
              <p-scroll-panel [style]="{height: '100%'}">
                <div class="max-xl:flex max-xl:flex-wrap xl:grid xl:grid-cols-3 gap-2">
                  @if (episodesQuery.isLoading()) {
                    @for (i of [1, 2, 3, 4, 5, 6, 7]; track i) {
                      <p-skeleton class="min-w-24" width="100%" height="57px" />
                    }
                  } @else if (episodesQuery.isSuccess()) {
                    @if (episodesQuery.data().length === 0) {
                      <div class="text-center col-span-full">
                        没有找到剧集信息
                      </div>
                    } @else {
                      @let selectedEpisode = $selectedEpisode();
                      @for (episode of $playlist(); track episode.url) {
                        @let isSelected = episode === selectedEpisode;
                        <div
                          class="p-4 p-button p-button-secondary transition-all hover:border-primary hover:border"
                          [class.border-primary]="isSelected"
                          (click)="onEpisodeClick(episode)"
                        >
                          <div class="flex-1 flex items-center">
                            <p
                              class="font-medium flex-1"
                              [class.text-primary]="isSelected"
                            >
                              {{ episode.name }}
                            </p>
                          </div>
                        </div>
                      }
                    }
                  }
                </div>
              </p-scroll-panel>
            </div>
          </p-card>
        </div>
      </div>

    </div>
  `,
})
export class KazumiDetailPage {
  private router = inject(Router)
  private kazumiService = inject(KazumiService)

  protected $searchDetails = computed(
    () => this.kazumiService.$searchDetails()!
  )
  protected $selectedEpisode = signal<{ name: string; url: string } | null>(
    null
  )
  protected $videoUrl = signal<string | undefined>(undefined)
  protected $isVideoUrlLoading = signal(false)
  protected $isVideoUrlError = signal(false)

  protected episodesQuery = injectQuery(() => {
    const { url, policy } = this.$searchDetails()

    return this.kazumiService.getChaptersQueryOptions(url, policy)
  })

  media$ = toObservable(this.$selectedEpisode).pipe(
    switchMap((episode) => {
      if (!episode) return EMPTY
      return this.kazumiService.getMediaInfoStream(episode.url).pipe(
        tap((media) => {
          this.$isVideoUrlLoading.set(true)
          if (!this.$videoUrl() && media.length > 0) {
            this.$videoUrl.set(media[0].src)
          }
        }),
        finalize(() => {
          this.$isVideoUrlLoading.set(false)
          if (!this.$videoUrl()) {
            this.$isVideoUrlError.set(true)
          }
        })
      )
    })
  )

  protected $playlistOptions = computed(
    () =>
      this.episodesQuery.data()?.map((_, i) => ({
        label: `播放列表${i + 1}`,
        value: i,
      })) ?? []
  )

  protected $playlistOption = linkedSignal(() => {
    return this.$playlistOptions()[0]
  })

  protected $playlist = computed(() => {
    const data = this.episodesQuery.data()
    const option = this.$playlistOption()
    if (data && option) {
      return data[option.value] ?? []
    }
    return []
  })

  protected onEpisodeClick(episode: { name: string; url: string }) {
    this.$selectedEpisode.set(episode)
    // void this.router.navigate(['/kazumi/watch'])
  }

  protected goBack() {
    this.router.navigate(['/kazumi/search'])
  }
}
