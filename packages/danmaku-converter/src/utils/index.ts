import { xml2json } from 'xml-js'

export const hexToRgb888 = (hex: string) => {
  return parseInt(hex.replace('#', '0x'))
}

export const rgb888ToHex = (rgb: number) => {
  return `#${`000000${rgb.toString(16)}`.slice(-6)}`
}

export const xmlToJSON = async (xml: string) => {
  return JSON.parse(xml2json(xml, { compact: true }))
}
