import {
  createExecutionContext,
  env,
  waitOnExecutionContext,
} from 'cloudflare:test'
import worker from '@/index'

export const makeUnitTestRequest = async (request: Request) => {
  const ctx = createExecutionContext()
  const response = await worker.fetch(request, env, ctx)
  await waitOnExecutionContext(ctx)
  return response
}
