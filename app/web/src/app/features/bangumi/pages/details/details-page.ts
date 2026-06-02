import { CommonModule } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core'
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
import type { BgmSubject } from '../../types/bangumi.types'
import { SubjectHeader } from './components/subject-header'
import { SummaryCard } from './components/summary-card'
import type { DetailsTab } from './details-tab'
import { isDetailsTab } from './details-tab'

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
    <div class="w-full p-3">
      @if (subjectDetailsQuery.isPending()) {
        <div class="flex justify-center items-center py-12">
          <p-progress-spinner />
        </div>
      } @else if (subjectDetailsQuery.isError()) {
        <div class="text-center py-12">
          <p class="text-red-500">加载失败，请稍后重试</p>
        </div>
      } @else if (subjectDetailsQuery.isSuccess()) {
        @let subject = subjectDetailsQuery.data();

        <da-subject-header
          [subject]="subject"
          (startSearch)="startSearch.emit($event)"
          (goBack)="goBack.emit()"
        />

        <da-summary-card [summary]="subject.summary" />

        <p-tabs lazy [(value)]="activeTab" (valueChange)="onTabChange($event)" scrollable>
          <p-tablist>
            <p-tab value="comments" data-testid="details-tab-comments">
              吐槽
            </p-tab>
            <p-tab value="episodes" data-testid="details-tab-episodes">
              剧集
            </p-tab>
            <p-tab value="characters" data-testid="details-tab-characters">
              角色
            </p-tab>
            <p-tab value="staff" data-testid="details-tab-staff">
              制作人员
            </p-tab>
            <p-tab value="relations" data-testid="details-tab-relations">
              相关作品
            </p-tab>
            <p-tab value="recommendations" data-testid="details-tab-recommendations">
              推荐
            </p-tab>
            <p-tab value="reviews" data-testid="details-tab-reviews">
              评论
            </p-tab>
            <p-tab value="topics" data-testid="details-tab-topics">
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
                (openDetails)="openDetails.emit($event)"
              />
            </p-tabpanel>

            <p-tabpanel value="recommendations">
              <da-recommendations-tab
                [subjectId]="subjectId"
                [visited]="visitedTabs().has('recommendations')"
                (openDetails)="openDetails.emit($event)"
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
  readonly id = input.required<number>()
  readonly tab = input<DetailsTab>('comments')

  readonly tabChange = output<DetailsTab>()
  readonly startSearch = output<BgmSubject>()
  readonly goBack = output<void>()
  readonly openDetails = output<number>()

  protected bangumiService = inject(BangumiService)

  protected visitedTabs = signal<Set<DetailsTab>>(new Set())
  protected activeTab = signal<DetailsTab>('comments')

  constructor() {
    effect(() => {
      const tab = this.tab()
      this.visitTab(tab)
      this.activeTab.set(tab)
    })
  }

  private visitTab(tab: DetailsTab) {
    this.visitedTabs.update((tabs) => new Set([...tabs, tab]))
  }

  protected onTabChange(value: unknown) {
    if (!isDetailsTab(value)) {
      return
    }
    this.visitTab(value)
    this.tabChange.emit(value)
  }

  protected subjectDetailsQuery = injectQuery(() => {
    return this.bangumiService.getSubjectDetailsQueryOptions(this.id())
  })
}
