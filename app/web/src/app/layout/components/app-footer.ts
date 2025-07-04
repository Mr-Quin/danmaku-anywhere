import { ChangeDetectionStrategy, Component, signal } from '@angular/core'
import { FaIconComponent } from '@fortawesome/angular-fontawesome'
import { faGithub } from '@fortawesome/free-brands-svg-icons'
import { PrivacyPolicyDialog } from '../../shared/components/privacy-policy-dialog'
import { GITHUB_REPO_URL } from '../../shared/constants'

@Component({
  selector: 'da-app-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrivacyPolicyDialog, FaIconComponent],
  template: `
    <footer class="py-4 px-6">
      <div
        class="max-w-6xl mx-auto flex flex-col items-center gap-4 text-sm text-surface-500">
        <div class="flex items-center gap-4">
          <button
            class="hover:text-primary transition-colors cursor-pointer"
            (click)="$showPrivacyDialog.set(true)">
            隐私政策
          </button>
          <a [href]="githubUrl" target="_blank" class="hover:text-primary transition-opacity">
            <fa-icon [icon]="github" />
          </a>
        </div>
        <div>
          © {{ currentYear }} Danmaku Anywhere
        </div>
      </div>
    </footer>

    <da-privacy-policy-dialog
      [visible]="$showPrivacyDialog()"
      (visibleChange)="$showPrivacyDialog.set($event)" />
  `,
})
export class AppFooter {
  protected $showPrivacyDialog = signal(false)
  protected currentYear = new Date().getFullYear()
  protected github = faGithub
  protected githubUrl = GITHUB_REPO_URL
}
