export const injectCss = (container: HTMLElement, css: string[]) => {
  css.forEach((css) => {
    const style = document.createElement('style')
    style.innerHTML = css
    container.appendChild(style)
  })
}
