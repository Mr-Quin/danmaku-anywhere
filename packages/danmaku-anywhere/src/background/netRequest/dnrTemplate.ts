export interface DnrTemplate {
  [headerName: string]: string
}

export interface DnrRuleSpec {
  matchUrl: string
  template: DnrTemplate
}

export type DnrContext = Record<string, string | number | boolean>

export function resolveDnrTemplate(
  template: DnrTemplate,
  context: DnrContext
): Record<string, string> {
  const result: Record<string, string> = {}

  for (const [headerName, valueTemplate] of Object.entries(template)) {
    result[headerName] = valueTemplate.replace(/\{(\w+)\}/g, (_, key) => {
      const value = context[key]
      return value !== undefined && value !== null ? String(value) : ''
    })
  }

  return result
}
