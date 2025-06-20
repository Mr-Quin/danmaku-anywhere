import { CommonModule } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  linkedSignal,
  signal,
} from '@angular/core'
import { FormsModule } from '@angular/forms'
import { Router } from '@angular/router'
import type { KazumiPolicy } from '@danmaku-anywhere/danmaku-provider/kazumi'
import { injectQuery } from '@tanstack/angular-query-experimental'
import { AutoFocus } from 'primeng/autofocus'
import { Button } from 'primeng/button'
import { Card } from 'primeng/card'
import { Dialog } from 'primeng/dialog'
import { InputText } from 'primeng/inputtext'
import { Tab, TabList, TabPanel, TabPanels, Tabs } from 'primeng/tabs'
import { bangumiNextClient } from '../../../bangumi-api/client'
import { MaterialIcon } from '../../../shared/components/material-icon'
import { randomFrom } from '../../../shared/utils/utils'
import { KazumiPolicyTab } from '../components/kazumi-policy-tab'
import { SearchResultsComponent } from '../components/kazumi-search-results'
import { KazumiService } from '../services/kazumi.service'
import { KazumiLayoutService } from '../services/kazumi-layout.service'

@Component({
  selector: 'da-kazumi-search-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    Button,
    InputText,
    Tabs,
    TabList,
    Tab,
    TabPanels,
    TabPanel,
    SearchResultsComponent,
    KazumiPolicyTab,
    Card,
    MaterialIcon,
    Dialog,
    AutoFocus,
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
      class="max-w-6xl mx-auto p-2 flex flex-col gap-4 items-center pt-[10vh] md:pt-[20vh] h-full transition-[padding] delay-150 duration-500"
      [class.!pt-0]="$hasQuery()"
    >
      @if (kazumiService.$hasPolicies()) {
        <p-card>
          <form (submit)="$event.preventDefault();triggerSearch()">
            <div class="w-xl flex gap-4 p-2">
              <div class="flex-1">
                <input
                  [pAutoFocus]="true"
                  type="text"
                  class="w-full"
                  [(ngModel)]="$localKeyword"
                  [ngModelOptions]="{ standalone: true }"
                  pInputText
                  [placeholder]="$searchPlaceholder() ?? '输入搜索关键词'"
                />
              </div>
              <p-button
                type="submit"
                [severity]="!$canSearch() ? 'secondary' : 'primary'"
                [disabled]="!$canSearch()"
              >
                <da-mat-icon icon="send" />
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
              <p-tabs [value]="activePolicy!.name">
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
          (onClick)="kazumiLayoutService.$showManageDialog.set(true);kazumiLayoutService.$showImportDialog.set(true)">
          导入规则
        </p-button>
      }
    </div>
    <p-dialog [modal]="true" [(visible)]="$showPolicy" header="使用须知" draggable="false"
              maskStyleClass="backdrop-blur-sm" dismissableMask="true">
      <div class="max-w-3xl">
        <ol class="list-decimal list-inside">
          <li>
            此网站依赖Danmaku Anywhere扩展
          </li>
          <li>
            搜索，获取剧集列表，以及获取视频链取功能需要在后台打开新窗口，获取结果后自动关闭。
            以搜索举例，进行搜索时会由扩展打开后台窗口并前往对应网站进行搜索操作，然后根据所选的规则获取搜索结果并关闭窗口。
            <ul class="list-disc list-inside ml-4">
              <li>
                每次操作时会打开一个新窗口，如果同时进行多个操作会打开多个窗口
              </li>
              <li>
                打开的窗口在任务栏中可见
              </li>
              <li>
                窗口可能一闪而过，属于正常现象。
              </li>
              <li>
                打开窗口等同于前往对应网站，
                <span class="font-bold underline">
                会在浏览器里留下浏览记录
                </span>
              </li>
              <li>
                在操作期间离开此网站可能导致后台窗口无法自动关闭，请手动关闭
              </li>
            </ul>
          </li>
          <li>
            基于工作原理，获取结果耗时可能较长
          </li>
          <li>
            请勿滥用
          </li>
        </ol>
        <div class="flex gap-2 mt-4 float-right">
          <p-button severity="secondary" (onClick)="$showPolicy.set(false)">
            关闭
          </p-button>
          @if (!kazumiService.$acceptedPolicy()) {
            <p-button (onClick)="acceptPolicy()">
              知道了
            </p-button>
          }
        </div>
      </div>
    </p-dialog>
  `,
})
export class KazumiSearchPage {
  protected kazumiService = inject(KazumiService)
  protected router = inject(Router)
  protected kazumiLayoutService = inject(KazumiLayoutService)

  protected $showPolicy = signal(false)

  private trendingQuery = injectQuery(() => {
    return {
      queryKey: ['bangumi'],
      queryFn: () => {
        return bangumiNextClient.GET('/p1/trending/subjects', {
          params: {
            query: {
              type: 2,
            },
          },
        })
      },
    }
  })

  protected $searchPlaceholder = computed(() => {
    if (this.trendingQuery.isSuccess()) {
      const data = this.trendingQuery.data().data?.data
      if (data && data.length > 0) {
        const item = randomFrom(data)
        return item.subject.nameCN
      }
    }
    return undefined
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
    if (!this.kazumiService.$acceptedPolicy()) {
      this.$showPolicy.set(true)
      return
    }
    // use user-entered string for search
    const keyword = this.$localKeyword().trim()
    if (keyword) {
      this.kazumiService.updateQuery(keyword)
      return
    }
    // or if there's a queried placeholder, use that as the search string
    const placeholder = this.$searchPlaceholder()
    if (placeholder) {
      this.kazumiService.updateQuery(placeholder)
      return
    }
  }

  protected acceptPolicy() {
    this.kazumiService.acceptPolicy()
    this.$showPolicy.set(false)
    this.triggerSearch()
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
    void this.router.navigate(['/kazumi/detail'])
  }
}
