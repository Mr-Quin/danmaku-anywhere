type PreemptListener = () => void

const listeners = new Set<PreemptListener>()

export function preemptAutomatic() {
  for (const listener of listeners) {
    listener()
  }
}

export function onPreemptAutomatic(listener: PreemptListener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
