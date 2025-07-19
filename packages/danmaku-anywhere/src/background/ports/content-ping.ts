import { portNames } from '@/common/ports/portNames'

export const setupContentPing = () => {
  chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== portNames.contentPing) return
    // don't need to listen for messages, just keep the port open
  })
}
