import {
  type IntegrationInput,
  type IntegrationPolicy,
  zIntegrationPolicy,
} from './schema.js'

export function createIntegrationInput(name = ''): IntegrationInput {
  return {
    version: 3,
    name: name,
    policy: {
      version: 3,
      title: {
        selector: [],
        regex: [],
      },
      episode: {
        selector: [],
        regex: [],
      },
      season: {
        selector: [],
        regex: [],
      },
      episodeTitle: {
        selector: [],
        regex: [],
      },
      options: {},
    },
  }
}

export function serializeIntegration(policy: IntegrationPolicy): string {
  return JSON.stringify(policy)
}

export function deserializeIntegration(policy: string): IntegrationPolicy {
  return zIntegrationPolicy.parse(JSON.parse(policy))
}
