import type { IntegrationPolicy } from '@danmaku-anywhere/integration-policy'

export const siteIntegrationPolicy: IntegrationPolicy = {
  episode: {
    regex: [],
    selector: [
      {
        quick: false,
        value: '//*[@id="media-episode"]',
      },
    ],
  },
  episodeTitle: {
    regex: [],
    selector: [],
  },
  options: {},
  season: {
    regex: [],
    selector: [],
  },
  title: {
    regex: [],
    selector: [
      {
        quick: false,
        value: '//*[@id="media-title"]',
      },
    ],
  },
  version: 3,
}
