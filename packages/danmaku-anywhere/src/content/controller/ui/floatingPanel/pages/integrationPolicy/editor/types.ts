export type IntegrationRuleItemNames =
  | 'policy.title'
  | 'policy.episode'
  | 'policy.season'
  | 'policy.episodeTitle'

export type IntegrationArrayFieldNames =
  | `${IntegrationRuleItemNames}.selector`
  | `${IntegrationRuleItemNames}.regex`
