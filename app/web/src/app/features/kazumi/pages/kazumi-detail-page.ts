import { CommonModule } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  signal,
  untracked,
} from '@angular/core'
import { FormsModule } from '@angular/forms'
import { ActivatedRoute, Router } from '@angular/router'
import type { MediaInfo } from '@danmaku-anywhere/web-scraper'
import { injectQuery } from '@tanstack/angular-query-experimental'
import { Button } from 'primeng/button'
import { Card } from 'primeng/card'
import { Panel } from 'primeng/panel'
import { ProgressSpinner } from 'primeng/progressspinner'
import { ScrollPanel } from 'primeng/scrollpanel'
import { Select } from 'primeng/select'
import { Skeleton } from 'primeng/skeleton'
import { Tag } from 'primeng/tag'
import { defer, type Subscription, tap } from 'rxjs'
import { TrackingService } from '../../../core/tracking.service'
import { VideoPlayer } from '../../../core/video-player/video-player'
import { MaterialIcon } from '../../../shared/components/material-icon'
import { UnescapePipePipe } from '../../../shared/pipes/UrlDecodePipe'
import { CommentsTab } from '../../bangumi/components/comments-tab'
import { BangumiService } from '../../bangumi/services/bangumi.service'
import { KazumiService } from '../services/kazumi.service'

interface Episode {
  name: string
  url: string
}

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
    UnescapePipePipe,
    CommentsTab,
  ],
  template: `
    <ng-template #commentSection>
      @if (type() === 'bangumi') {
        @let bgmId = id();
        @if (bgmId) {
          <p-panel styleClass="border-0">
            <ng-template #header>
              <h3 class="text-lg bold">
                吐槽
              </h3>
            </ng-template>
            <da-comments-tab [subjectId]="bgmId" [visited]="true" />
          </p-panel>
        }
      }
    </ng-template>
    <div class="flex flex-col">
      @let mediaDetails = $searchDetails();
      @if (mediaDetails) {
        <div class="mb-10 flex">
          <div class="flex flex-1 items-center gap-2">
            <h1 class="text-2xl font-semibold">
              <span id="media-title">{{ mediaDetails.title | unescape }}</span>
              @let selectedEpisode = $selectedEpisode();
              @if (selectedEpisode) {
                <span> - </span>
              }
              <span id="media-episode">@if (selectedEpisode) {
                {{ selectedEpisode.name }}
              }</span>
            </h1>
            <p-tag [value]="mediaDetails.policy.name" severity="secondary" />
          </div>
        </div>
      } @else {
        <div class="mb-10 flex">
          <div class="flex flex-1 items-center gap-2">
            <h1 class="text-2xl font-semibold">
              <span>加载中...</span>
            </h1>
          </div>
        </div>
      }

      <div class="grid grid-cols-1 xl:grid-cols-[1fr_424px] gap-8">
        <da-video-player
          [videoUrl]="$videoUrl()"
          [title]="$fullTitle()"
          [poster]="$posterUrl()"
          [showOverlay]="$showOverlay()"
          [hasPrevious]="$hasPrevious()"
          [hasNext]="$hasNext()"
          (previousEpisode)="onPreviousEpisode()"
          (nextEpisode)="onNextEpisode()"
        >
          <ng-template #content>
            <div class="size-full flex flex-col justify-center items-center">
              @let isLoading = episodesQuery.isPending() || $isVideoUrlLoading();
              @if (isLoading) {
                <p-progress-spinner />
                <p>
                  @if (episodesQuery.isPending()) {
                    正在获取剧集列表
                  }
                  @if ($isVideoUrlLoading()) {
                    正在获取视频链接
                  }
                </p>
              } @else if (episodesQuery.isError()) {
                <div class="text-center flex flex-col gap-4">
                  <p>获取剧集失败</p>
                  <p>
                    {{ episodesQuery.error() | json }}
                  </p>
                  <p-button
                    class="pointer-events-auto"
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
                  <p>请尝试其他播放列表或其他Kazumi规则</p>
                </div>
              } @else if (!$selectedEpisode()) {
                <p>
                  请选集
                </p>
              }
            </div>
          </ng-template>
        </da-video-player>
        <div class="flex flex-col gap-4">
          <p-panel toggler="header" toggleable="true" collapsed="true" styleClass="border-0">
            @let mediaList = $mediaList();
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
              @for (media of mediaList; track $index) {
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
                          (click)="changeEpisode(episode)"
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
        <ng-container [ngTemplateOutlet]="commentSection"></ng-container>
      </div>
    </div>
  `,
})
export class KazumiDetailPage {
  private kazumiService = inject(KazumiService)
  private bangumiService = inject(BangumiService)
  private router = inject(Router)
  private route = inject(ActivatedRoute)
  private readonly trackingService = inject(TrackingService)

  // query params
  readonly id = input<number>()
  readonly type = input<string>()
  readonly q = input<string>()
  readonly url = input<string>()
  readonly policyName = input<string>()
  readonly p = input<number>()
  readonly e = input<number>()

  protected $policy = computed(() => {
    const policyName = this.policyName()
    if (!policyName) return null

    const policies = this.kazumiService.localPoliciesQuery.data()
    if (!policies) return null

    return policies.find((p) => p.name === policyName) || null
  })

  protected $searchDetails = computed(() => {
    const title = this.q()
    const url = this.url()
    const policy = this.$policy()

    if (!title || !url || !policy) return null

    return {
      title,
      url,
      policy,
    }
  })

  protected $mediaList = signal<MediaInfo[]>([])
  protected $selectedEpisode = signal<Episode | null>(null)
  protected $videoUrl = signal<string | undefined>(undefined)
  protected $isVideoUrlLoading = signal(false)
  protected $isVideoUrlError = signal(false)

  protected episodesQuery = injectQuery(() => {
    const searchDetails = this.$searchDetails()

    if (!searchDetails) {
      return {
        queryKey: ['kazumi', 'chapters', 'disabled'],
        queryFn: () => Promise.resolve([]),
        enabled: false,
      }
    }

    const { url, policy } = searchDetails
    return this.kazumiService.getChaptersQueryOptions(url, policy)
  })

  protected bangumiSubjectQuery = injectQuery(() => {
    const id = this.id()
    const type = this.type()
    return {
      // biome-ignore lint/style/noNonNullAssertion: checked in 'enabled'
      ...this.bangumiService.getSubjectDetailsQueryOptions(id!),
      enabled: type === 'bangumi' && !!id,
    }
  })

  protected $posterUrl = computed(() => {
    const type = this.type()
    if (type === 'bangumi' && this.bangumiSubjectQuery.isSuccess()) {
      const subject = this.bangumiSubjectQuery.data()
      return subject?.images?.large || subject?.images?.common
    }
    return ''
  })

  protected $fullTitle = computed(() => {
    const searchDetails = this.$searchDetails()
    const title = searchDetails?.title || ''
    const episodeTitle = this.$selectedEpisode()?.name
    if (episodeTitle) {
      return `${title} - ${episodeTitle}`
    }
    return title
  })

  protected $showOverlay = computed(() => {
    return (
      this.$isVideoUrlLoading() ||
      this.$isVideoUrlError() ||
      !this.$selectedEpisode() ||
      this.episodesQuery.isPending()
    )
  })

  protected $currentEpisodeIndex = computed(() => {
    const selectedEpisode = this.$selectedEpisode()
    const playlist = this.$playlist()
    if (!selectedEpisode) return -1
    return playlist.findIndex((ep) => ep.url === selectedEpisode.url)
  })

  protected $hasPrevious = computed(() => {
    const currentIndex = this.$currentEpisodeIndex()
    return currentIndex > 0
  })

  protected $hasNext = computed(() => {
    const currentIndex = this.$currentEpisodeIndex()
    const playlist = this.$playlist()
    return currentIndex >= 0 && currentIndex < playlist.length - 1
  })

  protected $playlistOptions = computed(
    () =>
      this.episodesQuery.data()?.map((_, i) => ({
        label: `播放列表${i + 1}`,
        value: i,
      })) ?? []
  )

  protected $playlistOption = linkedSignal(() => {
    const options = this.$playlistOptions()
    const paramIndex = this.p()

    if (paramIndex !== undefined && options[paramIndex]) {
      return options[paramIndex]
    }

    return options[0]
  })

  protected $playlist = computed(() => {
    const data = this.episodesQuery.data()
    const option = this.$playlistOption()
    if (data && option) {
      return data[option.value] ?? []
    }
    return []
  })

  constructor() {
    // Handle initial episode selection from URL parameter
    effect(() => {
      const episodeIndex = this.e()
      const playlist = this.$playlist()
      const currentSelected = this.$selectedEpisode()

      // Only set initial episode if we have an index param, playlist is loaded, and current selection doesn't match
      if (
        episodeIndex !== undefined &&
        playlist.length > 0 &&
        episodeIndex >= 0 &&
        episodeIndex < playlist.length &&
        !currentSelected
      ) {
        const episode = playlist[episodeIndex]
        if (episode) {
          this.changeEpisode(episode)
        }
      }
    })

    // Sync playlist index from URL parameter
    effect(() => {
      const playlistOption = this.$playlistOption()
      const currentPlaylistIndex = this.p()

      if (playlistOption && currentPlaylistIndex !== playlistOption.value) {
        this.updateUrlParams({
          p: playlistOption.value,
        })
      }
    })

    // Sync selected episode from URL parameter
    effect(() => {
      const selectedEpisode = this.$selectedEpisode()
      const currentEpisodeIndex = this.e()
      const episodeIndex = this.$currentEpisodeIndex()

      if (
        selectedEpisode &&
        episodeIndex >= 0 &&
        currentEpisodeIndex !== episodeIndex
      ) {
        this.updateUrlParams({
          e: episodeIndex,
        })
      }
    })

    // Set initial video URL after episode query is successful
    // TODO: Show be set according to the watch history
    effect(() => {
      const playlist = this.$playlist()
      if (playlist.length > 0) {
        if (!untracked(() => this.$selectedEpisode())) {
          // if no episode is selected, set the first one
          this.changeEpisode(playlist[0])
        }
      }
    })
  }

  protected changeEpisode(episode: Episode) {
    this.trackingService.track('changeEpisode', {
      episode,
    })
    this.$selectedEpisode.set(episode)
    this.$isVideoUrlLoading.set(true)
    this.$isVideoUrlError.set(false)
    this.$mediaList.set([])
    // set url to empty string to unload the current video
    this.$videoUrl.set('')
    this.subscribeMediaStream(episode.url)
  }

  private updateUrlParams(params: { p?: number; e?: number }) {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    })
  }

  protected onPreviousEpisode() {
    this.trackingService.track('goToPreviousEpisode')
    const currentIndex = this.$currentEpisodeIndex()
    const playlist = this.$playlist()
    if (currentIndex > 0) {
      const previousEpisode = playlist[currentIndex - 1]
      this.changeEpisode(previousEpisode)
    }
  }

  protected onNextEpisode() {
    this.trackingService.track('goToNextEpisode')
    const currentIndex = this.$currentEpisodeIndex()
    const playlist = this.$playlist()
    if (currentIndex >= 0 && currentIndex < playlist.length - 1) {
      const nextEpisode = playlist[currentIndex + 1]
      this.changeEpisode(nextEpisode)
    }
  }

  private mediaSubscription: Subscription | null = null

  private subscribeMediaStream(url: string) {
    if (this.mediaSubscription) {
      this.mediaSubscription.unsubscribe()
    }

    this.mediaSubscription = defer(() => {
      return this.kazumiService.getMediaInfoStream(url).pipe(
        tap((mediaInfo) => {
          this.trackingService.track('fetchMediaInfo', {
            mediaInfo,
            episode: this.$selectedEpisode(),
            show: this.$searchDetails(),
          })
          // if no video is available yet, set it to the first one found
          if (mediaInfo[0] && !this.$videoUrl()) {
            this.$videoUrl.set(mediaInfo[0].src)
          }
          this.$mediaList.update((prev) => {
            return [...prev, ...mediaInfo]
          })
        })
      )
    }).subscribe({
      complete: () => {
        this.$isVideoUrlLoading.set(false)
        if (
          this.$selectedEpisode()?.url === url &&
          this.$mediaList().length === 0
        ) {
          // the episode might have changed, but if we are still on the same episode, and there are no media found, then set the error
          this.$isVideoUrlError.set(true)
        }
      },
    })
  }
}
