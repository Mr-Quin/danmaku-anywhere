export const moveElement = (element: HTMLElement, root: HTMLElement) => {
  const parent = element.parentElement
  root.appendChild(element)

  return () => {
    if (!parent) element.remove()
    parent?.appendChild(element)
  }
}
