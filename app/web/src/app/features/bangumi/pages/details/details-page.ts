import { CommonModule } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  signal,
} from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { injectQuery } from '@tanstack/angular-query-experimental'
import { ProgressSpinner } from 'primeng/progressspinner'
import { Tab, TabList, TabPanel, TabPanels, Tabs } from 'primeng/tabs'
import { CharactersTab } from '../../components/characters-tab'
import { CommentsTab } from '../../components/comments-tab'
import { EpisodesTab } from '../../components/episodes-tab'
import { RecommendationsTab } from '../../components/recommendations-tab'
import { RelationsTab } from '../../components/relations-tab'
import { ReviewsTab } from '../../components/reviews-tab'
import { StaffTab } from '../../components/staff-tab'
import { TopicsTab } from '../../components/topics-tab'
import { BangumiService } from '../../services/bangumi.service'
import { SubjectHeader } from './components/subject-header'
import { SummaryCard } from './components/summary-card'

@Component({
  selector: 'da-details-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ProgressSpinner,
    Tabs,
    TabList,
    Tab,
    TabPanels,
    TabPanel,
    SubjectHeader,
    SummaryCard,
    EpisodesTab,
    CharactersTab,
    StaffTab,
    RelationsTab,
    RecommendationsTab,
    ReviewsTab,
    TopicsTab,
    CommentsTab,
  ],
  template: `
    <div class="max-w-7xl mx-auto p-4">
      @if (subjectDetailsQuery.isPending()) {
        <div class="flex justify-center items-center py-12">
          <p-progress-spinner />
        </div>
      } @else if (subjectDetailsQuery.isError()) {
        <div class="text-center py-12">
          <p class="text-red-500">加载失败，请稍后重试</p>
        </div>
      } @else if (subjectDetailsQuery.isSuccess()) {
        @let response = subjectDetailsQuery.data();
        @let subject = response;

        <da-subject-header [subject]="subject" />

        <da-summary-card [summary]="subject.summary" />

        <p-tabs lazy [(value)]="activeTab" (valueChange)="onTabChange($event)" scrollable>
          <p-tablist>
            <p-tab value="comments">
              吐槽
            </p-tab>
            <p-tab value="episodes">
              剧集
            </p-tab>
            <p-tab value="characters">
              角色
            </p-tab>
            <p-tab value="staff">
              制作人员
            </p-tab>
            <p-tab value="relations">
              相关作品
            </p-tab>
            <p-tab value="recommendations">
              推荐
            </p-tab>
            <p-tab value="reviews">
              评论
            </p-tab>
            <p-tab value="topics">
              讨论
            </p-tab>
          </p-tablist>

          @let subjectId = id();
          <p-tabpanels>
            <p-tabpanel value="comments">
              <da-comments-tab
                [subjectId]="subjectId"
                [visited]="visitedTabs().has('comments')"
              />
            </p-tabpanel>

            <p-tabpanel value="episodes">
              <da-episodes-tab
                [subjectId]="subjectId"
                [visited]="visitedTabs().has('episodes')"
              />
            </p-tabpanel>

            <p-tabpanel value="characters">
              <da-characters-tab
                [subjectId]="subjectId"
                [visited]="visitedTabs().has('characters')"
              />
            </p-tabpanel>

            <p-tabpanel value="staff">
              <da-staff-tab
                [subjectId]="subjectId"
                [visited]="visitedTabs().has('staff')"
              />
            </p-tabpanel>

            <p-tabpanel value="relations">
              <da-relations-tab
                [subjectId]="subjectId"
                [visited]="visitedTabs().has('relations')"
              />
            </p-tabpanel>

            <p-tabpanel value="recommendations">
              <da-recommendations-tab
                [subjectId]="subjectId"
                [visited]="visitedTabs().has('recommendations')"
              />
            </p-tabpanel>

            <p-tabpanel value="reviews">
              <da-reviews-tab
                [subjectId]="subjectId"
                [visited]="visitedTabs().has('reviews')"
              />
            </p-tabpanel>

            <p-tabpanel value="topics">
              <da-topics-tab
                [subjectId]="subjectId"
                [visited]="visitedTabs().has('topics')"
              />
            </p-tabpanel>
          </p-tabpanels>
        </p-tabs>
      }

    </div>
  `,
})
export class DetailsPage {
  // query param
  t = input<string>('comments')
  // path param
  id = input.required<number>()

  private route = inject(ActivatedRoute)
  private router = inject(Router)
  protected bangumiService = inject(BangumiService)

  protected visitedTabs = signal<Set<unknown>>(new Set())
  protected activeTab = signal<string>('comments')

  constructor() {
    effect(() => {
      const tab = this.t()
      if (this.isValidTab(tab)) {
        this.visitTab(this.t())
        this.activeTab.set(this.t())
      } else {
        this.visitTab('comments')
      }
    })
  }

  private visitTab(tab: string) {
    this.visitedTabs.update((tabs) => new Set([...tabs, tab]))
  }

  protected onTabChange(value: unknown) {
    this.visitTab(value as string)

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { t: value },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    })
  }

  private isValidTab(tab: string): tab is string {
    const validTabs = [
      'comments',
      'episodes',
      'characters',
      'staff',
      'relations',
      'recommendations',
      'reviews',
      'topics',
    ]
    return validTabs.includes(tab)
  }

  protected subjectDetailsQuery = injectQuery(() => {
    return this.bangumiService.getSubjectDetailsQueryOptions(this.id())
  })
}
