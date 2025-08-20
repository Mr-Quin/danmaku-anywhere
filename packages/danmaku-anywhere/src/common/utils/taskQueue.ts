export type TaskFunction<T> = () => PromiseLike<T> | T

export interface TaskQueue {
  run<T>(task: TaskFunction<T>): Promise<T>
}

type QueueItem<T> = {
  task: TaskFunction<T>
  resolve: (value: T) => void
  reject: (reason: unknown) => void
}

/**
 * Creates a simple array-backed task queue with FIFO execution.
 * - Tasks are executed one-by-one in order.
 * - Each task runs on a microtask (Promise job), matching tail-chaining behavior.
 * - Errors reject only that task's promise; the queue keeps processing.
 */
export const createTaskQueue = (): TaskQueue => {
  const queue: QueueItem<unknown>[] = []
  let isRunning = false

  const scheduleRun = () => {
    if (!isRunning) {
      void runQueue()
    }
  }

  const runQueue = async () => {
    if (isRunning) return
    isRunning = true
    try {
      while (queue.length > 0) {
        const { task, resolve, reject } = queue.shift() as QueueItem<unknown>
        try {
          const result = await Promise.resolve().then(
            task as TaskFunction<unknown>
          )
          resolve(result)
        } catch (error) {
          reject(error)
        }
      }
    } finally {
      isRunning = false
      if (queue.length > 0) scheduleRun()
    }
  }

  return {
    run<T>(task: TaskFunction<T>): Promise<T> {
      return new Promise<T>((resolve, reject) => {
        const item: QueueItem<T> = { task, resolve, reject }
        queue.push(item as QueueItem<unknown>)
        scheduleRun()
      })
    },
  }
}
