import { z } from 'zod'
import { zIntegrationPolicyV3 } from './migrations/v3.js'
import { migrateV3PolicyToV4 } from './migrations/v4.js'
import {
  type IntegrationInput,
  type IntegrationPolicy,
  zIntegrationPolicy,
} from './schema.js'

const zStoredIntegrationPolicy = z.union([
  zIntegrationPolicy,
  zIntegrationPolicyV3.transform(migrateV3PolicyToV4),
])

export function createIntegrationInput(name = ''): IntegrationInput {
  return {
    version: 4,
    name: name,
    policy: {
      version: 4,
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
  return zStoredIntegrationPolicy.parse(JSON.parse(policy))
}
