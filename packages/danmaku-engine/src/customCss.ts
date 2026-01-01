export type CustomCssRule = [string, string]

export const normalizeCssProperty = (property: string): string =>
  property
    .trim()
    .toLowerCase()
    .replace(/-([a-z])/g, (_, char: string) => char.toUpperCase())

export const parseCustomCss = (cssText?: string): CustomCssRule[] => {
  if (!cssText) return []

  return cssText
    .split(';')
    .map((declaration) => declaration.trim())
    .filter(Boolean)
    .map((declaration) => {
      const [rawProperty, ...rawValue] = declaration.split(':')
      const property = rawProperty?.trim() ?? ''
      const value = rawValue.join(':').trim()

      if (!property || !value) return null

      return [property, value] as CustomCssRule
    })
    .filter((rule): rule is CustomCssRule => Boolean(rule))
}

export const applyCustomCss = (
  node: HTMLElement,
  rules: CustomCssRule[]
): void => {
  for (const [property, value] of rules) {
    node.style.setProperty(property, value)
  }
}
