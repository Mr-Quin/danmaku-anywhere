import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppError } from '@/common/errors/AppError'
import { describeCode } from '@/common/errors/describeError'
import '@/common/localization/i18n'
import { ProviderConfigForm } from './ProviderConfigForm'
import type { ProviderFormProps } from './types'

/**
 * The editor of a source whose manifest can't run here. The spec request
 * answers unavailable with the reason, and the form still opens: the name can be
 * changed, the stored settings are shown but can't be, and saving sends the
 * stored settings back unchanged.
 */

const getSpec = vi.hoisted(() => vi.fn())

vi.mock('@/common/rpcClient/background/client', () => ({
  chromeRpcClient: {
    providerGetManifestSpec: getSpec,
    fetchImage: async ({ src }: { src: string }) => ({ data: src }),
  },
}))

vi.mock('@/common/options/providerConfig/useSourceNames', () => ({
  useSourceNames: () => ({ defaultNameOf: () => 'My DanDanPlay' }),
}))

const stored = {
  id: 'future-1',
  manifestId: 'my-ddp',
  customName: 'Future Source',
  enabled: true,
  configValues: { baseUrl: 'https://ddp.mine.example' },
}

let root: Root | undefined
let container: HTMLElement
let onSubmit: ReturnType<typeof vi.fn<ProviderFormProps['onSubmit']>>

async function render() {
  await act(async () => {
    root?.render(
      <QueryClientProvider client={new QueryClient()}>
        <ProviderConfigForm provider={stored} onSubmit={onSubmit} isEdit />
      </QueryClientProvider>
    )
  })
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

function nameInput(): HTMLInputElement {
  const input = container.querySelector<HTMLInputElement>('input[name="name"]')
  if (!input) {
    throw new Error('no name field')
  }
  return input
}

async function typeName(value: string) {
  const input = nameInput()
  const setValue = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value'
  )?.set
  await act(async () => {
    setValue?.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

async function submit() {
  const form = container.querySelector('form')
  await act(async () => {
    form?.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true })
    )
  })
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  onSubmit = vi.fn<ProviderFormProps['onSubmit']>()
  getSpec.mockReset()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  container.remove()
  vi.unstubAllGlobals()
})

describe('ProviderConfigForm for a manifest that cannot run', () => {
  it.each([
    'needs-newer-extension',
    'invalid-manifest',
    'not-registered',
  ] as const)('opens with the name editable and the settings read-only (%s)', async (reason) => {
    getSpec.mockResolvedValue({ data: { status: 'unavailable', reason } })

    await render()

    expect(nameInput().value).toBe('Future Source')
    expect(nameInput().disabled).toBe(false)
    const setting = container.querySelector<HTMLInputElement>(
      'input[value="https://ddp.mine.example"]'
    )
    expect(setting?.readOnly).toBe(true)
    expect(container.textContent).toContain(
      describeCode('manifest.unavailable', { manifestId: 'my-ddp', reason })
    )
  })

  it('saves a rename with the stored settings unchanged', async () => {
    getSpec.mockResolvedValue({
      data: { status: 'unavailable', reason: 'needs-newer-extension' },
    })
    await render()

    await typeName('Renamed Source')
    await submit()

    expect(onSubmit).toHaveBeenCalledWith({
      customName: 'Renamed Source',
      configValues: stored.configValues,
    })
  })

  it('still shows the load error for any other failure', async () => {
    getSpec.mockRejectedValue(new AppError('rpc.unreachable'))

    await render()

    expect(container.querySelector('input[name="name"]')).toBeNull()
  })
})
