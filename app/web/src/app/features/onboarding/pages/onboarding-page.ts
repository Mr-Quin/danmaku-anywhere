import { CommonModule } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  type OnInit,
} from '@angular/core'
import { ProgressSpinner } from 'primeng/progressspinner'
import { OnboardingService } from '../services/onboarding.service'

@Component({
  selector: 'da-kazumi-onboarding-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ProgressSpinner],
  template: `
    <div class="grow h-full flex items-center justify-center">
      <div class="text-center">
        <p-progress-spinner />
        <p class="mt-4 text-lg text-gray-600 dark:text-gray-300">
          @switch ($onboardingStatus()) {
            @case ('idle') {
              正在进行初始设置，请稍候...
            }
            @case ('pending') {
              正在添加Kazumi规则...
            }
            @case ('success') {
              初始设置完成
            }
            @case ('error') {
              初始设置失败
            }
          }
        </p>
      </div>
    </div>
  `,
})
export class OnboardingPage implements OnInit {
  protected onboardingService = inject(OnboardingService)

  readonly $onboardingStatus = this.onboardingService.$onboardingStatus

  ngOnInit() {
    void this.onboardingService.acceptKazumiPolicyAndInstallRecommended()
  }
}
