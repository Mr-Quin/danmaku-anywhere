export type NotPromise<T> = T extends Promise<any> ? never : T
