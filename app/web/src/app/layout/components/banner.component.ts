import { ChangeDetectionStrategy, Component } from '@angular/core'
import { DocMigrationBanner } from './doc-migration-banner.component'
import { ExtensionUpdateBanner } from './extension-update-banner.component'

@Component({
  selector: 'da-banner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DocMigrationBanner, ExtensionUpdateBanner],
  template: `
    <da-extension-update-banner />
    <da-doc-migration-banner />
  `,
})
export class Banner {}
