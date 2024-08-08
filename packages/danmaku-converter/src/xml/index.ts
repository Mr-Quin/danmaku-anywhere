import { xml2json } from 'xml-js'

export const xmlToJSON = async (xml: string) => {
  return JSON.parse(xml2json(xml, { compact: true }))
}
