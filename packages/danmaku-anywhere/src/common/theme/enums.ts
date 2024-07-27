export enum ColorMode {
  Dark = 'dark',
  Light = 'light',
  System = 'system',
}

export type ColorModeStrings = `${ColorMode}`

export const ColorModeList = [
  {
    value: ColorMode.Dark,
    label: 'colorScheme.Dark',
  },
  {
    value: ColorMode.Light,
    label: 'colorScheme.Light',
  },
  {
    value: ColorMode.System,
    label: 'colorScheme.System',
  },
]
