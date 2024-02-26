declare global {
  interface ObjectConstructor {
    groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]>
  }
}

export {}
