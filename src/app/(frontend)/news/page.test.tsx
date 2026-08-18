import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../../../publicContent/getPublicContent', () => ({
  getPublicNews: async () => [
    {
      category: '创作动态',
      member: { name: '虚构作家', slug: 'fictional-writer' },
      publishedAt: '2026-08-18T00:00:00.000Z',
      sourceName: '虚构公众号',
      sourceUrl: 'https://example.com/article',
      summary: '这是一段公开摘要。',
      title: '虚构文学动态',
    },
  ],
}))

import NewsPage from './page'

describe('公开动态页', () => {
  it('展示已公开动态的来源链接，且不显示内部核实内容', async () => {
    const markup = renderToStaticMarkup(await NewsPage())

    expect(markup).toContain('虚构文学动态')
    expect(markup).toContain('查看原文')
    expect(markup).toContain('href="https://example.com/article"')
    expect(markup).toContain('href="/members/fictional-writer"')
    expect(markup).not.toContain('仅内部核实')
  })
})
