export function createDanmakuContainers() {
  const wrapper = document.createElement('div')
  wrapper.id = 'danmaku-anywhere-manager-container'
  wrapper.style.position = 'absolute'
  wrapper.style.pointerEvents = 'none'
  wrapper.style.top = '0'
  wrapper.style.left = '0'
  wrapper.style.width = '0' // override later
  wrapper.style.height = '0'
  wrapper.style.overflow = 'hidden'
  wrapper.style.border = 'none'
  wrapper.style.boxSizing = 'border-box'

  const container = document.createElement('div')
  container.style.width = '100%'
  container.style.height = '100%'

  wrapper.appendChild(container)

  return { wrapper, container }
}
