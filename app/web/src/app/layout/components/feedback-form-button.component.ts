import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core'
import { ButtonDirective } from 'primeng/button'
import { ExtensionService } from '../../core/extension/extension.service'

@Component({
  selector: 'da-feedback-form-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonDirective],
  template: `
    <a pButton size="small" severity="info" target="_blank" [href]="$formUrl()">问题反馈</a>
  `,
})
export class FeedbackFormButton {
  protected readonly extensionService = inject(ExtensionService)

  protected readonly $formUrl = computed(() => {
    const id = this.extensionService.$id()
    const version = this.extensionService.$installedVersion()
    let url =
      'https://forms.clickup.com/90131020449/f/2ky3men1-973/SA0BEERBNFY3NR31P8?'

    if (id) {
      url += `ID=${id}&`
    }
    if (version) {
      url += `Version=${version}&`
    }
    return url
  })
}
