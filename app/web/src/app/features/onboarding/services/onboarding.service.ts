import { computed, Injectable, inject, signal } from '@angular/core'
import { Router } from '@angular/router'
import { MessageService } from 'primeng/api'
import { TrackingService } from '../../../core/tracking.service'
import { KazumiService } from '../../kazumi/services/kazumi.service'

const ACCEPTED_POLICY_KEY = 'accepted-policy'

@Injectable({
  providedIn: 'root',
})
export class OnboardingService {
  private trackingService = inject(TrackingService)
  private readonly kazumiService = inject(KazumiService)
  private readonly router = inject(Router)
  protected messageService = inject(MessageService)

  private readonly $_acceptedPolicy = signal(
    !!localStorage.getItem(ACCEPTED_POLICY_KEY)
  )

  readonly $isOnboardingComplete = computed(() => {
    return this.$_acceptedPolicy()
  })

  readonly $onboardingStatus =
    this.kazumiService.addRecommendedPolicyMutation.status

  async acceptKazumiPolicyAndInstallRecommended(): Promise<void> {
    this.kazumiService.addRecommendedPolicyMutation.mutate(undefined, {
      onError: (error) => {
        this.trackingService.track('onboarding_finish', {
          success: false,
          error: error.message,
        })
        this.messageService.add({
          severity: 'error',
          detail: `添加初始规则失败: ${error.message}`,
          life: 3000,
        })
      },
      onSuccess: () => {
        this.trackingService.track('onboarding_finish', { success: true })
        this.messageService.add({
          severity: 'success',
          detail: '初始设置成功！',
          life: 3000,
        })
      },
      onSettled: () => {
        this.acceptPolicy()
        void this.router.navigate([''], { replaceUrl: true })
      },
    })
  }

  private acceptPolicy() {
    this.$_acceptedPolicy.set(true)
    localStorage.setItem(ACCEPTED_POLICY_KEY, '1')
  }
}
