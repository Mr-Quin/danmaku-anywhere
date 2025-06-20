import { Injectable, signal } from '@angular/core'

@Injectable({
  providedIn: 'root',
})
export class KazumiLayoutService {
  $showManageDialog = signal(false)
  $showImportDialog = signal(false)
}
