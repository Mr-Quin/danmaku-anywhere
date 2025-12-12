export type LocalizationLabelMap<Keys extends string> = Readonly<
  Record<Keys, () => string>
>

export function createLocalizationMap<Keys extends string>(
  map: LocalizationLabelMap<Keys>
): LocalizationLabelMap<Keys> {
  return Object.freeze(map)
}
