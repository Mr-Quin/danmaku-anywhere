import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, Component } from '@angular/core'
import { RouterLink } from '@angular/router'
import { FaIconComponent } from '@fortawesome/angular-fontawesome'
import { faGithub } from '@fortawesome/free-brands-svg-icons'
import { ButtonDirective } from 'primeng/button'
import { Tag } from 'primeng/tag'
import { GITHUB_REPO_URL } from '../../shared/constants'
import { Banner } from './banner'

@Component({
  selector: 'da-app-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterLink,
    Tag,
    Banner,
    FaIconComponent,
    ButtonDirective,
  ],
  host: {
    class: 'basis-0 sticky z-100 top-0',
  },
  template: `
    <da-banner />
    <div class="backdrop-blur-sm bg-transparent border-b-surface-800 border-b">
      <div class="h-[56px] mx-auto px-4 py-2 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-2">
            <h1 class="text-2xl font-bold"><a routerLink="/">
              Danmaku Somewhere
            </a></h1>
            <p-tag value="预览" severity="info" />
          </div>
        </div>
        <a pButton rounded size="small" severity="secondary" text [href]="githubUrl" target="_blank">
          <fa-icon [icon]="github" size="lg" />
        </a>
      </div>
    </div>
  `,
})
export class AppBar {
  protected readonly githubUrl = GITHUB_REPO_URL
  protected readonly github = faGithub
}
