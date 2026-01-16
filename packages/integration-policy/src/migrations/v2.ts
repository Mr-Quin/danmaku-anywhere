import type { IntegrationV1 } from './v1.js'

export interface IntegrationV2 {
  name: string
  id: string
  policy: {
    title: {
      selector: { value: string; quick: boolean }[]
      regex: { value: string; quick: boolean }[]
    }
    episode: {
      selector: { value: string; quick: boolean }[]
      regex: { value: string; quick: boolean }[]
    }
    season: {
      selector: { value: string; quick: boolean }[]
      regex: { value: string; quick: boolean }[]
    }
    episodeTitle: {
      selector: { value: string; quick: boolean }[]
      regex: { value: string; quick: boolean }[]
    }
    options: {
      titleOnly: boolean
      dandanplay: {
        useMatchApi: boolean
      }
      useAI?: boolean
    }
  }
}

export function migrateV1ToV2(data: IntegrationV1[]): IntegrationV2[] {
  const mapValue = (value: string) => {
    return { value, quick: false }
  }

  return data.map((policy) => {
    return {
      name: policy.name,
      id: policy.id,
      policy: {
        title: {
          selector: policy.policy.title.selector.map(mapValue),
          regex: policy.policy.title.regex.map(mapValue),
        },
        episode: {
          selector: policy.policy.episode.selector.map(mapValue),
          regex: policy.policy.episode.regex.map(mapValue),
        },
        season: {
          selector: policy.policy.season.selector.map(mapValue),
          regex: policy.policy.season.regex.map(mapValue),
        },
        episodeTitle: {
          selector: policy.policy.episodeTitle.selector.map(mapValue),
          regex: policy.policy.episodeTitle.regex.map(mapValue),
        },
        options: {
          titleOnly: policy.policy.titleOnly,
          dandanplay: {
            useMatchApi: false,
          },
        },
      },
    } satisfies IntegrationV2
  })
}
