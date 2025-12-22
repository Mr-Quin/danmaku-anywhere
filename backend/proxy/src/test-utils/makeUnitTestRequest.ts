import {
  createExecutionContext,
  env,
  waitOnExecutionContext,
} from 'cloudflare:test'
import type { Hono } from 'hono'
import worker from '@/index'

interface MakeUnitTestRequestOptions {
  app?: Hono
}
export const makeUnitTestRequest = async (
  request: Request,
  { app: appProp }: MakeUnitTestRequestOptions = {}
) => {
  const ctx = createExecutionContext()
  const app = appProp || worker
  const response = await app.fetch(request, env, ctx)
  await waitOnExecutionContext(ctx)
  return response
}
