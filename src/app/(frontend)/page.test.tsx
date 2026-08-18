import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import HomePage from './page'

describe('Writers Circle 首页', () => {
  it('展示项目的英文名和中文名', () => {
    const markup = renderToStaticMarkup(<HomePage />)

    expect(markup).toContain('Writers Circle')
    expect(markup).toContain('三十二人文学志')
  })

  it('提供清楚的投稿入口', () => {
    const markup = renderToStaticMarkup(<HomePage />)

    expect(markup).toContain('href="/submit"')
    expect(markup).toContain('我要投稿')
  })

  it('提供成员和文学动态入口', () => {
    const markup = renderToStaticMarkup(<HomePage />)

    expect(markup).toContain('href="/members"')
    expect(markup).toContain('href="/news"')
  })

  it('提供公开文学作品入口', () => {
    const markup = renderToStaticMarkup(<HomePage />)

    expect(markup).toContain('href="/works"')
    expect(markup).toContain('文学作品')
  })
})
