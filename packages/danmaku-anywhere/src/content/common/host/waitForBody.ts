/**
 * Wait for document.body to be available.
 * Content scripts running at document_start may execute before the body is parsed.
 */
export function waitForBody(): Promise<HTMLElement> {
  if (document.body) {
    return Promise.resolve(document.body)
  }
  const { promise, resolve } = Promise.withResolvers<HTMLElement>()
  document.addEventListener('DOMContentLoaded', () => resolve(document.body), {
    once: true,
  })
  // Guard against DOMContentLoaded having already fired between the check
  // and the listener. Resolving an already-resolved promise is a no-op.
  if (document.body) {
    resolve(document.body)
  }
  return promise
}
