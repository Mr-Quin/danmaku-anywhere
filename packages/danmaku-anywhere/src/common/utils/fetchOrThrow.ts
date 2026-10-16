import { err, ok, type Result } from '@danmaku-anywhere/result'
import { AppError, type ErrorTarget } from '@/common/errors/AppError'
import { classifyFetchRejection } from '@/common/errors/fetchFailure'

interface FetchInit {
  signal?: AbortSignal | null
}

type Fetcher<I extends FetchInit, R extends { status: number }> = (
  input: string,
  init?: I
) => Promise<R>

export async function fetchChecked<
  I extends FetchInit,
  R extends { status: number },
>(
  fetcher: Fetcher<I, R>,
  input: string,
  init?: I,
  target?: ErrorTarget
): Promise<Result<R, AppError>> {
  let response: R
  try {
    response = await fetcher(input, init)
  } catch (e) {
    return err(classifyFetchRejection(e, init?.signal, target))
  }
  if (response.status < 200 || response.status >= 300) {
    return err(
      new AppError(
        'http',
        { status: response.status, target },
        { message: `HTTP ${response.status} for ${input}` }
      )
    )
  }
  return ok(response)
}

export async function fetchOrThrow<
  I extends FetchInit,
  R extends { status: number },
>(
  fetcher: Fetcher<I, R>,
  input: string,
  init?: I,
  target?: ErrorTarget
): Promise<R> {
  const result = await fetchChecked(fetcher, input, init, target)
  if (!result.success) {
    throw result.error
  }
  return result.data
}
