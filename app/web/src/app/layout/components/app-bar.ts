import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, Component } from '@angular/core'
import { RouterLink } from '@angular/router'
import { FaIconComponent } from '@fortawesome/angular-fontawesome'
import { faGithub } from '@fortawesome/free-brands-svg-icons'
import { GITHUB_REPO_URL } from '../../shared/constants'

@Component({
  selector: 'da-app-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, FaIconComponent],
  host: {
    class: 'basis-0 sticky z-100 top-0',
  },
  template: `
    <div class="backdrop-blur-sm bg-transparent">
      <div class="max-w-[96rem] h-[56px] mx-auto px-4 py-2 flex items-center justify-between">
        <div class="flex items-center">
          <h1 class="text-2xl font-bold"><a routerLink="/">
            Danmaku Somewhere
          </a></h1>
        </div>
        <div class="flex items-center space-x-4 text-lg">
<!--          <a-->
<!--            routerLink="/kazumi"-->
<!--            routerLinkActive="font-bold"-->
<!--            class="hover:underline accent-primary primary"-->
<!--          >-->
<!--            Kazumi-->
<!--          </a>-->
          <a [href]="githubUrl" target="_blank">
            <fa-icon [icon]="github" />
          </a>
        </div>
      </div>
    </div>
  `,
})
export class AppBar {
  github = faGithub
  githubUrl = GITHUB_REPO_URL
}
