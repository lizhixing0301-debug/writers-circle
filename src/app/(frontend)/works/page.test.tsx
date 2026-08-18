import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../../../publicContent/getPublicContent', () => ({
  getPublicWorks: async () => [
    {
      authorName: '公开笔名',
      category: '诗歌',
      content: '虚构正文内容。',
      excerpt: '虚构作品导语。',
      publishedAt: '2026-08-18T00:00:00.000Z',
      slug: 'fictional-work',
      title: '允许公开的虚构作品',
    },
  ],
}))

import WorksPage from './page'

describe('公开作品列表页', () => {
  it('显示公开署名、导语和作品详情链接', async () => {
    const markup = renderToStaticMarkup(await WorksPage())

    expect(markup).toContain('允许公开的虚构作品')
    expect(markup).toContain('公开笔名')
    expect(markup).toContain('虚构作品导语')
    expect(markup).toContain('href="/works/fictional-work"')
  })
})
