import { Injectable } from '@angular/core'
import type {
  KazumaManifest,
  KazumiPolicy,
} from '@danmaku-anywhere/danmaku-provider/kazumi'
import {
  KazumiCatalog,
  type ManifestResult,
  type PolicyResult,
} from '../kazumi-catalog'

// Names the onboarding recommended-policy install looks for, plus a couple
// extra so the rules manager has a non-trivial catalog in fake mode.
const FAKE_MANIFESTS: KazumaManifest[] = [
  '7sefun',
  'dlma',
  'ffdm',
  'yinghua',
  'gugu',
].map((name) => ({
  name,
  version: '1.0.0',
  useNativePlayer: false,
  author: 'fake',
  lastUpdate: 1735689600000,
}))

function makeFakePolicy(name: string): KazumiPolicy {
  return {
    api: '1',
    type: 'anime',
    name,
    version: '1.0.0',
    muliSources: true,
    useWebview: false,
    useNativePlayer: false,
    usePost: false,
    useLegacyParser: false,
    userAgent: '',
    baseURL: `https://fake.kazumi/${name}`,
    searchURL: `https://fake.kazumi/${name}/search?q=@keyword`,
    searchList: '//div',
    searchName: './/h3/text()',
    searchResult: './/a/@href',
    chapterRoads: '//div',
    chapterResult: './/a',
    referer: '',
  }
}

@Injectable()
export class FakeKazumiCatalog extends KazumiCatalog {
  async getManifest(): Promise<ManifestResult> {
    return { success: true, data: FAKE_MANIFESTS }
  }

  async getPolicy(fileName: string): Promise<PolicyResult> {
    const name = fileName.replace(/\.json$/, '')
    return { success: true, data: makeFakePolicy(name) }
  }
}
