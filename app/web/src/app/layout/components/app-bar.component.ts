import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { RouterLink } from '@angular/router'
import { FaIconComponent } from '@fortawesome/angular-fontawesome'
import { faGithub } from '@fortawesome/free-brands-svg-icons'
import { ButtonDirective } from 'primeng/button'
import { Tag } from 'primeng/tag'
import { MaterialIcon } from '../../shared/components/material-icon'
import { SearchTriggerComponent } from '../../features/search/search-trigger'
import { GITHUB_REPO_URL, PAGE_TITLE } from '../../shared/constants'
import { LayoutService } from '../layout.service'
import { ExtensionUpdateBanner } from './extension-update-banner.component'
import { FeedbackFormButton } from './feedback-form-button.component'

@Component({
  selector: 'da-app-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterLink,
    Tag,
    FaIconComponent,
    ButtonDirective,
    MaterialIcon,
    ExtensionUpdateBanner,
    FeedbackFormButton,
    SearchTriggerComponent,
  ],
  host: {
    class: 'basis-0 sticky z-100 top-0',
  },
  template: `
    <da-extension-update-banner />
    <div class="backdrop-blur-sm bg-transparent border-b-surface-800 border-b h-[56px]">
      <div class="h-full mx-auto px-4 py-2 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <button
            pButton
            type="button"
            class="md:hidden"
            severity="secondary"
            rounded
            text
            (click)="layoutService.toggleSidebar()"
          >
            <da-mat-icon icon="menu" size="lg" />
          </button>
          <div class="flex items-center gap-2">
            <h1 class="text-2xl font-bold"><a routerLink="/">
              {{ PAGE_TITLE }}
            </a></h1>
            <p-tag value="预览" severity="info" />
          </div>
        </div>
        <div class="max-md:hidden flex items-center gap-2">
          <da-search-trigger />
          <a pButton rounded size="small" severity="secondary" text [href]="githubUrl" target="_blank">
            <fa-icon [icon]="github" size="lg" />
          </a>
          <da-feedback-form-button />
        </div>
      </div>
    </div>
  `,
})
export class AppBar {
  protected readonly githubUrl = GITHUB_REPO_URL
  protected readonly github = faGithub
  protected readonly PAGE_TITLE = PAGE_TITLE
  protected layoutService = inject(LayoutService)
}
