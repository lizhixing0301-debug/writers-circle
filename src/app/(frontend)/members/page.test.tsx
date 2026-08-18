import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../../../publicContent/getPublicContent', () => ({
  getPublicMembers: async () => [
    {
      literaryIdentities: ['诗人'],
      name: '虚构作家',
      organizations: [],
      representativeWorks: [],
      slug: 'fictional-writer',
      websites: [],
    },
  ],
}))

import MembersPage from './page'

describe('公开成员列表页', () => {
  it('渲染公开成员资料和个人页面链接', async () => {
    const markup = renderToStaticMarkup(await MembersPage())

    expect(markup).toContain('虚构作家')
    expect(markup).toContain('诗人')
    expect(markup).toContain('href="/members/fictional-writer"')
    expect(markup).not.toContain('内部备注')
  })
})
