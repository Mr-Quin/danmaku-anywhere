import skipButtonStyle from './SkipButton/SkipButton.module.css?inline'

export const setupCss = (container: HTMLElement) => {
  const style = document.createElement('style')
  style.innerHTML = skipButtonStyle

  container.appendChild(style)
}
