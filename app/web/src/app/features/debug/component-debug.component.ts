import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, Component } from '@angular/core'
import type { LegacyBgmSubject } from '../bangumi/types/bangumi.types'
import { BangumiSearchResultListItem } from '../search/bangumi-search-result-list-item.component'
import legacyBangumiSubjects from './component-data/legacy-bangumi-subjects.json' with {
  type: 'json',
}

@Component({
  selector: 'da-component-debug',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, BangumiSearchResultListItem],
  template: `
      <div>
        @for (subject of bangumiSubjects; track subject.id) {
          <da-bangumi-search-result-list-item [subject]="subject" />
        }
      </div>
    `,
})
export class ComponentDebugComponent {
  readonly bangumiSubjects: LegacyBgmSubject[] =
    legacyBangumiSubjects as unknown as LegacyBgmSubject[]
}
