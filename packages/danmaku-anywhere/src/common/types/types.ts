export type NotPromise<T> = T extends Promise<never> ? never : T

// required for useQuery to accept placeholderData
// eslint-disable-next-line @typescript-eslint/ban-types
export type NonFunctionGuard<T> = T extends Function ? never : T
