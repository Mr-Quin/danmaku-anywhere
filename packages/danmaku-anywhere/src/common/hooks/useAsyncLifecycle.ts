import { Reducer, useReducer } from 'react'

interface State<T> {
  data: T | null
  error: unknown
  isLoading: boolean
  isInit: boolean
  isSuccess: boolean
  isError: boolean
}

type Action<T> =
  | { type: 'LOADING' }
  | { type: 'SET'; payload: T | null }
  | { type: 'ERROR'; payload: unknown }
  | { type: 'INIT' }

const initialState = {
  data: null,
  error: null,
  isLoading: false,
  isInit: true,
  isSuccess: false,
  isError: false,
}

const reducer = <T>(state: State<T>, action: Action<T>): State<T> => {
  switch (action.type) {
    case 'LOADING':
      return { ...state, isLoading: true, isError: false, isSuccess: false }
    case 'SET':
      return {
        ...state,
        data: action.payload,
        isLoading: false,
        isInit: false,
        isSuccess: true,
      }
    case 'ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false,
        isError: true,
        isSuccess: false,
        isInit: false,
      }
    case 'INIT':
      return { ...state, isInit: false }
    default:
      throw new Error('unknown action')
  }
}
export const useAsyncLifecycle = <T>(initialData?: T) => {
  const [state, dispatch] = useReducer<Reducer<State<T>, Action<T>>>(reducer, {
    ...initialState,
    data: initialData ?? null,
    isInit: initialData === undefined,
  })

  return [state, dispatch] as const
}
