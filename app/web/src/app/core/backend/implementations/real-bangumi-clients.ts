import type { Provider } from '@angular/core'
import { bangumiClient } from '../../../features/bangumi/services/bangumiClient'
import { bangumiNextClient } from '../../../features/bangumi/services/bangumiNextClient'
import { BANGUMI_CLIENT, BANGUMI_NEXT_CLIENT } from '../bangumi-clients'

export const realBangumiProviders: Provider[] = [
  { provide: BANGUMI_CLIENT, useValue: bangumiClient },
  { provide: BANGUMI_NEXT_CLIENT, useValue: bangumiNextClient },
]
