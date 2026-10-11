import { Injectable } from '@angular/core'
import {
  getManifest,
  getPolicy,
} from '@danmaku-anywhere/danmaku-provider/kazumi'
import {
  KazumiCatalog,
  type ManifestResult,
  type PolicyResult,
} from '../kazumi-catalog'

@Injectable()
export class RealKazumiCatalog extends KazumiCatalog {
  getManifest(): Promise<ManifestResult> {
    return getManifest()
  }

  getPolicy(fileName: string): Promise<PolicyResult> {
    return getPolicy(fileName)
  }
}
