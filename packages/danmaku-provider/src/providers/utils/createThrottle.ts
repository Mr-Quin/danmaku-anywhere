export const createThrottle = (delayMs: number): (() => Promise<void>) => {
  // Next call to throttle is delayed until this time
  let minNextTime = 0

  return async function throttle() {
    const currentTime = Date.now()

    let waitTime = 0

    /**
     * If the next time is less than the current time, it means that the delay has already passed.
     * In this case, we don't need to wait, just update the next time.
     */
    if (minNextTime < currentTime) {
      minNextTime = currentTime + delayMs
      waitTime = 0
    } else {
      /**
       * If the next time is greater than the current time, we need to wait until the next time, then increase the next time.
       */
      waitTime = minNextTime - currentTime
      minNextTime += delayMs
    }

    await new Promise((resolve) => setTimeout(resolve, waitTime))
  }
}
