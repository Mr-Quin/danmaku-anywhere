// What fetch rejects with when the host cannot be reached, per engine
// (Chromium, Firefox, Safari). The RPC hop rewraps the error in an
// RpcException, so the message is what is left to match.
const NETWORK_ERROR_MESSAGE =
  /^(TypeError: )?(Failed to fetch|NetworkError when attempting to fetch resource\.?|Load failed)$/

export function isNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false
  }
  return NETWORK_ERROR_MESSAGE.test(error.message)
}
