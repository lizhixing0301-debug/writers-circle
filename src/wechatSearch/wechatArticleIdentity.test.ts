import { describe, expect, it } from 'vitest'

import {
  createWechatArticleReference,
  normalizeWechatArticleUrl,
} from './wechatArticleIdentity'

describe('微信公众号文章网址', () => {
  it('统一使用 HTTPS，并移除分享跟踪参数和片段', () => {
    expect(
      normalizeWechatArticleUrl(
        'http://mp.weixin.qq.com/s/FICTIONAL_TOKEN?scene=1&srcid=test#wechat_redirect',
      ),
    ).toBe('https://mp.weixin.qq.com/s/FICTIONAL_TOKEN')
  })

  it('保留打开旧式文章需要的参数，但不同跟踪参数使用相同身份', () => {
    const first =
      'https://mp.weixin.qq.com/s?__biz=MzA1&mid=2247001&idx=1&sn=abc&chksm=def&scene=1'
    const second =
      'https://mp.weixin.qq.com/s?idx=1&mid=2247001&__biz=MzA1&sn=abc&chksm=def&from=timeline'

    expect(normalizeWechatArticleUrl(first)).toContain('__biz=MzA1')
    expect(normalizeWechatArticleUrl(first)).toContain('sn=abc')
    expect(normalizeWechatArticleUrl(first)).not.toContain('scene=')
    expect(createWechatArticleReference(first)).toBe(
      createWechatArticleReference(second),
    )
  })

  it('短链接路径相同的文章使用相同身份', () => {
    expect(
      createWechatArticleReference(
        'https://mp.weixin.qq.com/s/FICTIONAL_TOKEN?scene=1',
      ),
    ).toBe(
      createWechatArticleReference(
        'https://mp.weixin.qq.com/s/FICTIONAL_TOKEN?from=singlemessage',
      ),
    )
    expect(
      createWechatArticleReference('https://mp.weixin.qq.com/s/FICTIONAL_TOKEN'),
    ).toMatch(/^wechat:[a-f0-9]{64}$/)
  })

  it.each([
    'https://mp.weixin.qq.com.evil.example/s/test',
    'https://user:password@mp.weixin.qq.com/s/test',
    'ftp://mp.weixin.qq.com/s/test',
    'https://example.com/article',
    '不是网址',
    '',
  ])('拒绝不是公开微信公众号文章的网址 %s', (url) => {
    expect(normalizeWechatArticleUrl(url)).toBeNull()
    expect(createWechatArticleReference(url)).toBeNull()
  })
})
