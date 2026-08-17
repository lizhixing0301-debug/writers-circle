import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import HomePage from './page'

describe('Writers Circle 首页', () => {
  it('展示项目的英文名和中文名', () => {
    const markup = renderToStaticMarkup(<HomePage />)

    expect(markup).toContain('Writers Circle')
    expect(markup).toContain('三十二人文学志后台')
  })
})
