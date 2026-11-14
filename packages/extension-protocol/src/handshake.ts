const DA_EXT_ATTR = 'da-ext-version'

export interface ExtensionInfo {
  version: string
  id?: string
}

export const setExtensionAttr = (info: ExtensionInfo) => {
  document.documentElement.setAttribute(DA_EXT_ATTR, info.version)
  if (info.id) {
    document.documentElement.setAttribute('da-ext-id', info.id)
  }
}

export const getExtensionAttr = (): Partial<ExtensionInfo> => {
  const version = document.documentElement.getAttribute('da-ext-version')
  const id = document.documentElement.getAttribute('da-ext-id')

  return {
    version: version ?? undefined,
    id: id ?? undefined,
  }
}
