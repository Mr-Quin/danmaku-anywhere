import { setupContentPing } from '@/background/ports/content-ping'
import { setupExtractMedia } from '@/background/ports/media-extraction'

export const setupPorts = () => {
  setupExtractMedia()
  setupContentPing()
}
