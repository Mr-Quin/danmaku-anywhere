import type { NetworkMock } from '../setup/profile'

// The providers list runs each configured provider's login probe on render.
// Specs that visit /providers mock the probes so network strict-mode and the
// console gate stay clean. The tencent mock is inert when tencent is not in
// the profile.
export function mockLoginProbes(): NetworkMock[] {
  return [
    {
      pattern: /api\.bilibili\.com\/x\/web-interface\/nav/,
      respond: (route) =>
        route.fulfill({
          json: { code: 0, message: '0', data: { isLogin: true } },
        }),
    },
    {
      pattern:
        /pbaccess\.video\.qq\.com\/.*page_server_rpc\.PageServer\/GetPageData/,
      respond: (route) =>
        route.fulfill({ json: { ret: 0, msg: '', data: {} } }),
    },
  ]
}
