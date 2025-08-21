export const injectCss = (container: HTMLElement, css: string) => {
  const style = document.createElement('style')
  style.innerHTML = css
  container.appendChild(style)
}
