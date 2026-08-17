import { describe, expect, it } from 'vitest'

import { authenticated } from './authenticated'

describe('authenticated', () => {
  it('未登录时拒绝访问', () => {
    expect(authenticated({ req: { user: null } } as never)).toBe(false)
  })

  it('存在登录用户时允许访问', () => {
    expect(
      authenticated({ req: { user: { id: 1, collection: 'users' } } } as never),
    ).toBe(true)
  })
})
