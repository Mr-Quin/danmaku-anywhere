import { createFactory } from 'hono/factory'

export const factory = createFactory<{ Bindings: Env }>()
