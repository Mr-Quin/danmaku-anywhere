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
} from '@angular/core'
import { FormsModule } from '@angular/forms'
import { ActivatedRoute, Router } from '@angular/router'
import type { KazumiPolicy } from '@danmaku-anywhere/danmaku-provider/kazumi'
import { injectInfiniteQuery } from '@tanstack/angular-query-experimental'
import { AutoCompleteModule } from 'primeng/autocomplete'
import { AutoFocus } from 'primeng/autofocus'
import { Button } from 'primeng/button'
import { Card } from 'primeng/card'
import { InputTextModule } from 'primeng/inputtext'
import { ProgressSpinner } from 'primeng/progressspinner'
import { Tab, TabList, TabPanel, TabPanels, Tabs } from 'primeng/tabs'
import { MaterialIcon } from '../../../shared/components/material-icon'
import { randomFrom } from '../../../shared/utils/utils'
import { BangumiService } from '../../bangumi/services/bangumi.service'
import { SettingsService } from '../../settings/settings.service'
import { KazumiPolicyImportDialog } from '../components/kazumi-policy-readme'
import { KazumiPolicyTab } from '../components/kazumi-policy-tab'
import { SearchResultsComponent } from '../components/kazumi-search-results'
import { KazumiService } from '../services/kazumi.service'

@Component({
  selector: 'da-kazumi-search-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    AutoCompleteModule,
    InputTextModule,
    ProgressSpinner,
    Card,
    Button,
    Tabs,
    TabList,
    Tab,
    TabPanels,
    TabPanel,
    MaterialIcon,
    KazumiPolicyTab,
    SearchResultsComponent,
    AutoFocus,
    KazumiPolicyImportDialog,
  ],
  styles: `
      #search-results {
          transition-property: opacity, height;
          transition-duration: 500ms;

          @starting-style {
              height: 0;
              opacity: 0;
          }
      }
  `,
  template: `
    <div
      class="max-w-6xl mx-auto mt-16 p-2 flex flex-col gap-4 items-center pt-[10vh] md:pt-[20vh] h-full transition-[padding] delay-150 duration-500"
      [class.!pt-0]="$hasQuery()"
    >
      @if (kazumiService.localPoliciesQuery.isPending()) {
        <p-progress-spinner />
      } @else if (kazumiService.$hasPolicies()) {
        <p-card>
          <form (submit)="$event.preventDefault();triggerSearch()">
            <div class="md:w-xl flex gap-4 p-2 items-center">
              <div class="flex-1">
                <input
                  [pAutoFocus]="true"
                  type="text"
                  class="w-full"
                  [(ngModel)]="$localKeyword"
                  [ngModelOptions]="{ standalone: true }"
                  pInputText
                  [placeholder]="$searchPlaceholder()"
                />
              </div>
              <p-button
                type="submit"
                [severity]="!$canSearch() ? 'secondary' : 'primary'"
                [disabled]="!$canSearch()"
              >
                <da-mat-icon icon="send" size="lg" />
              </p-button>
            </div>
          </form>
          <p class="text-gray-500 text-sm">
          <span>
            基于
          </span>
            <a href="https://github.com/Predidit/Kazumi" class="underline" target="_blank" rel="noreferrer">
              Kazumi
            </a>
            <span>
            规则的番剧搜索。使用前请阅读
          </span>
            <span class="underline hover:cursor-pointer" (click)="$showPolicy.set(true)">
            使用需知
          </span>
            。
          </p>
        </p-card>

        @if ($hasQuery() && kazumiService.localPoliciesQuery.isSuccess() && kazumiService.$activePolicy(); as
          activePolicy) {
          @let allPolicies = kazumiService.localPoliciesQuery.data();
          @if (allPolicies.length > 0) {
            <div id="search-results" class="self-stretch h-max transition-all">
              <p-tabs [value]="activePolicy!.name" scrollable>
                <p-tablist>
                  @for (policy of allPolicies; track policy.name) {
                    <p-tab
                      [value]="policy.name"
                      (click)="onTabClick(policy)"
                    >
                      <da-kazumi-policy-tab
                        [policy]="policy"
                        [keyword]="kazumiService.$searchQuery()"
                        [isActive]="activePolicy?.name === policy.name"
                        [isVisited]="kazumiService.$visitedTabs().get(policy.name) ?? false"
                      />
                    </p-tab>
                  }
                </p-tablist>

                <p-tabpanels>
                  @for (policy of allPolicies; track policy.name) {
                    <p-tabpanel [value]="policy.name">
                      <da-kazumi-search-results
                        [policy]="policy"
                        [keyword]="kazumiService.$searchQuery()"
                        [isActive]="activePolicy?.name === policy.name"
                        [isVisited]="kazumiService.$visitedTabs().get(policy.name) ?? false"
                        (itemClick)="onItemClick($event, policy)"
                      />
                    </p-tabpanel>
                  }
                </p-tabpanels>
              </p-tabs>
            </div>
          }
        }
      } @else {
        当前不存在Kazumi规则，请先导入
        <p-button
          (onClick)="kazumiService.addRecommendedPolicyMutation.mutate()"
          [loading]="kazumiService.addRecommendedPolicyMutation.isPending() || kazumiService.manifestsQuery.isPending()"
        >
          一键使用推荐规则
        </p-button>
        <p-button
          severity="secondary"
          text
          (onClick)="openSettings()">
          手动导入规则
        </p-button>
      }
    </div>
    <da-kazumi-policy-readme [(visible)]="$showPolicy" [accepted]="true"
    />
  `,
})
export class KazumiSearchPage {
  // query param
  q = input<string>()

  protected kazumiService = inject(KazumiService)
  protected router = inject(Router)
  protected route = inject(ActivatedRoute)
  private settingsService = inject(SettingsService)
  protected bangumiService = inject(BangumiService)

  protected $showPolicy = signal(false)

  private trendingQuery = injectInfiniteQuery(() => {
    return this.bangumiService.getTrendingInfiniteQueryOptions()
  })

  protected $searchPlaceholder = computed(() => {
    if (this.trendingQuery.isSuccess()) {
      const { pages } = this.trendingQuery.data()
      if (pages.length > 0) {
        const item = randomFrom(pages[0].data)
        return item.subject.nameCN
      }
    } else if (this.trendingQuery.isPending()) {
      return ''
    }
    return '输入搜索关键词'
  })

  protected $localKeyword = linkedSignal(() =>
    this.kazumiService.$searchQuery()
  )
  protected $hasQuery = computed(() => this.kazumiService.$searchQuery() !== '')

  protected $canSearch = computed(() => {
    if (!this.kazumiService.$hasPolicies()) return false
    if (this.$localKeyword()) {
      return (
        this.$localKeyword().trim() !== '' &&
        this.$localKeyword() !== this.kazumiService.$searchQuery()
      )
    }
    if (this.$searchPlaceholder()) {
      return this.$searchPlaceholder() !== this.kazumiService.$searchQuery()
    }
    return false
  })

  protected triggerSearch() {
    // use user-entered string for search,
    // or if there's a queried placeholder, use that as the search string
    const searchTerm = this.$localKeyword().trim() || this.$searchPlaceholder()
    if (searchTerm) {
      this.kazumiService.updateQuery(searchTerm)
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { q: searchTerm },
        queryParamsHandling: 'replace',
        replaceUrl: true,
      })
      return
    }
  }

  protected onTabClick(policy: KazumiPolicy) {
    this.kazumiService.setActivePolicy(policy)
  }

  protected onItemClick(
    item: { name: string; url: string },
    policy: KazumiPolicy
  ) {
    this.kazumiService.updateSearchDetails({
      url: item.url,
      title: item.name,
      policy,
    })
    void this.router.navigate(['/kazumi/detail'], {
      queryParamsHandling: 'merge',
    })
  }

  constructor() {
    effect(() => {
      const query = this.q()
      if (query) {
        this.kazumiService.updateQuery(query)
      }
    })
  }

  protected openSettings() {
    this.settingsService.show('kazumi-import')
  }
}
