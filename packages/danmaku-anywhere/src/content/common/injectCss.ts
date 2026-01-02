export const injectCss = (container: HTMLElement, css: string[]) => {
  const injected: HTMLElement[] = []

  css.forEach((css) => {
    const style = document.createElement('style')
    style.innerHTML = css
    container.appendChild(style)
    injected.push(style)
  })

  return injected
}
