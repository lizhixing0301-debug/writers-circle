import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

const { notFound } = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND')
  }),
}))

vi.mock('next/navigation', () => ({ notFound }))
vi.mock('../../../../publicContent/getPublicContent', () => ({
  getPublicMemberBySlug: async (slug: string) =>
    slug === 'fictional-writer'
      ? {
          disabilityCategory: '肢体',
          literaryIdentities: ['诗人'],
          name: '虚构作家',
          organizations: ['虚构文学社'],
          publicBiography: '这是一段公开简介。',
          representativeWorks: [{ title: '虚构作品', type: '诗集', year: 2026 }],
          slug,
          websites: [],
        }
      : undefined,
}))

import MemberDetailPage from './page'

describe('公开成员详情页', () => {
  it('只渲染安全公开资料', async () => {
    const markup = renderToStaticMarkup(
      await MemberDetailPage({ params: Promise.resolve({ slug: 'fictional-writer' }) }),
    )

    expect(markup).toContain('虚构作家')
    expect(markup).toContain('肢体')
    expect(markup).toContain('虚构作品')
    expect(markup).not.toContain('内部备注')
  })

  it('未公开或不存在的成员返回不存在页面', async () => {
    await expect(
      MemberDetailPage({ params: Promise.resolve({ slug: 'not-public' }) }),
    ).rejects.toThrow('NEXT_NOT_FOUND')
    expect(notFound).toHaveBeenCalledOnce()
  })
})
