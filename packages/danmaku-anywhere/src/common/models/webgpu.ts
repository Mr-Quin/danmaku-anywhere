// `navigator.gpu` exists in Chrome even when it has no usable adapter (blocked
// GPU, disabled hardware acceleration), so only an adapter proves WebGPU works.
export async function hasWebGpuAdapter(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.gpu) {
    return false
  }
  try {
    return (await navigator.gpu.requestAdapter()) !== null
  } catch {
    return false
  }
}
