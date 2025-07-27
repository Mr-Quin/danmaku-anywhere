import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, Component } from '@angular/core'
import { RouterLink } from '@angular/router'
import { FaIconComponent } from '@fortawesome/angular-fontawesome'
import { faGithub } from '@fortawesome/free-brands-svg-icons'
import { Button, ButtonDirective } from 'primeng/button'
import { Tag } from 'primeng/tag'
import { GITHUB_REPO_URL, PAGE_TITLE } from '../../shared/constants'
import { DocMigrationBanner } from './doc-migration-banner.component'
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
    DocMigrationBanner,
    ExtensionUpdateBanner,
    Button,
    FeedbackFormButton,
  ],
  host: {
    class: 'basis-0 sticky z-100 top-0',
  },
  template: `
    <da-doc-migration-banner />
    <da-extension-update-banner />
    <div class="backdrop-blur-sm bg-transparent border-b-surface-800 border-b h-[56px]">
      <div class="h-full mx-auto px-4 py-2 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-2">
            <h1 class="text-2xl font-bold"><a routerLink="/">
              {{ PAGE_TITLE }}
            </a></h1>
            <p-tag value="预览" severity="info" />
          </div>
        </div>
        <div>
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
}
