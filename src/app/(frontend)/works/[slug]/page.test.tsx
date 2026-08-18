import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

const { notFound } = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND')
  }),
}))

vi.mock('next/navigation', () => ({ notFound }))
vi.mock('../../../../publicContent/getPublicContent', () => ({
  getPublicWorkBySlug: async (slug: string) =>
    slug === 'fictional-work'
      ? {
          authorName: '公开笔名',
          category: '诗歌',
          content: '第一段虚构正文。\n\n<script>不能执行</script>\n\n第三段虚构正文。',
          member: { name: '虚构作家', slug: 'fictional-writer' },
          publishedAt: '2026-08-18T00:00:00.000Z',
          slug,
          title: '允许公开的虚构作品',
        }
      : undefined,
}))

import WorkDetailPage from './page'

describe('公开作品详情页', () => {
  it('按段落显示纯文本并转义网页代码', async () => {
    const markup = renderToStaticMarkup(
      await WorkDetailPage({ params: Promise.resolve({ slug: 'fictional-work' }) }),
    )

    expect(markup).toContain('第一段虚构正文')
    expect(markup).toContain('第三段虚构正文')
    expect(markup).toContain('&lt;script&gt;不能执行&lt;/script&gt;')
    expect(markup).not.toContain('<script>不能执行</script>')
    expect(markup).toContain('href="/members/fictional-writer"')
  })

  it('不存在或未公开的作品返回不存在页面', async () => {
    await expect(
      WorkDetailPage({ params: Promise.resolve({ slug: 'hidden-work' }) }),
    ).rejects.toThrow('NEXT_NOT_FOUND')
    expect(notFound).toHaveBeenCalledOnce()
  })
})
