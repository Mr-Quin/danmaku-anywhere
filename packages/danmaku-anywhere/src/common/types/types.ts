export type NotPromise<T> = T extends Promise<never> ? never : T

// required for useQuery to accept placeholderData
export type NonFunctionGuard<T> = T extends Function ? never : T
