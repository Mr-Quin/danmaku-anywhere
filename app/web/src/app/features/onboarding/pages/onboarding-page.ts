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
      <p-progress-spinner />
    </div>
  `,
})
export class OnboardingPage implements OnInit {
  protected onboardingService = inject(OnboardingService)

  ngOnInit() {
    void this.onboardingService.acceptKazumiPolicyAndInstallRecommended()
  }
}
