type PreemptListener = () => void

const listeners = new Set<PreemptListener>()

// Danmaku the user mounts or removes win over automatic matching still in
// flight.
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
