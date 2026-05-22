import { expect, test } from '@playwright/test'

/**
 * Temporary demo spec to surface the failing-test shape of the e2e PR
 * comment. Asserts a deliberate false equality so the report has a
 * failure row to render. Delete after verification.
 */

test('demo failure: this test fails on purpose', async () => {
  expect(1).toBe(2)
})

test('demo pass: control row alongside the failure', async () => {
  expect(true).toBe(true)
})
