import { describe, expect, it, vi } from 'vitest'

import { createJustOneApiWechatProvider } from './justOneApiProvider'

const token = 'fictional-secret-token-for-tests'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json' },
    status,
  })
}

describe('Just One API 微信公众号文章搜索适配器', () => {
  it('使用固定费用边界请求最近一周最新结果，并且不把 Token 放进网址', async () => {
    const requests: Request[] = []
    const fetchImpl = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      requests.push(new Request(input, init))

      return jsonResponse({
        code: 0,
        data: {
          articles: [
            {
              digest: '<p>完全虚构的&nbsp;文章摘要。</p>',
              link: 'http://mp.weixin.qq.com/s/FICTIONAL_ARTICLE?scene=1',
              nickname: '虚构文学公众号',
              publish_time: 1786924800,
              title: '<em>虚构成员</em>参加文学活动',
            },
            {
              link: 'https://mp.weixin.qq.com/s/FICTIONAL_ARTICLE?from=timeline',
              nickname: '重复结果',
              title: '同一篇文章的重复结果',
            },
          ],
        },
        message: null,
        recordTime: '2026-08-18T00:00:00.000Z',
      })
    }) as typeof fetch
    const provider = createJustOneApiWechatProvider({ fetchImpl, token })

    const items = await provider.search('  虚构成员  ')

    expect(requests).toHaveLength(1)
    expect(requests[0].url).toBe(
      'https://api.justoneapi.com/api/weixin/search-article/v1',
    )
    expect(requests[0].url).not.toContain(token)
    expect(requests[0].method).toBe('POST')
    expect(requests[0].headers.get('content-type')).toBe(
      'application/x-www-form-urlencoded',
    )
    await expect(requests[0].text()).resolves.toBe(
      new URLSearchParams({
        cookies_buffer: '',
        currentPage: '1',
        keyword: '虚构成员',
        offset: '0',
        publishTimeType: 'SEVEN_DAYS',
        sortType: 'LATEST',
        token,
      }).toString(),
    )
    expect(items).toEqual([
      {
        publishedAt: '2026-08-17T00:00:00.000Z',
        sourceName: '虚构文学公众号',
        summary: '完全虚构的 文章摘要。',
        title: '虚构成员参加文学活动',
        url: 'https://mp.weixin.qq.com/s/FICTIONAL_ARTICLE',
      },
    ])
  })

  it('递归查找可识别记录，并忽略非微信链接、缺少标题和损坏日期', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        code: 0,
        data: {
          nested: {
            list: [
              {
                account_name: '虚构号二',
                article_title: '可识别的虚构文章',
                article_url: 'https://mp.weixin.qq.com/s/SECOND_FICTIONAL',
                description: '摘要',
                publishedAt: '2026-08-18T02:03:04.000Z',
              },
              { title: '普通网页', url: 'https://example.com/not-wechat' },
              { url: 'https://mp.weixin.qq.com/s/NO_TITLE' },
              {
                publish_time: '无法识别的日期',
                title: '日期损坏但文章仍可作为线索',
                url: 'https://mp.weixin.qq.com/s/BROKEN_DATE',
              },
            ],
          },
        },
        message: null,
        recordTime: null,
      }),
    ) as typeof fetch

    await expect(
      createJustOneApiWechatProvider({ fetchImpl, token }).search('虚构查询'),
    ).resolves.toEqual([
      {
        publishedAt: '2026-08-18T02:03:04.000Z',
        sourceName: '虚构号二',
        summary: '摘要',
        title: '可识别的虚构文章',
        url: 'https://mp.weixin.qq.com/s/SECOND_FICTIONAL',
      },
      {
        title: '日期损坏但文章仍可作为线索',
        url: 'https://mp.weixin.qq.com/s/BROKEN_DATE',
      },
    ])
  })

  it('识别真实 V1 返回中的 doc_url 和 source 字段', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        code: 0,
        data: {
          data: [
            {
              items: [
                {
                  date: 1786924800,
                  desc: '完全虚构的真实结构摘要',
                  docID: 'FICTIONAL_DOCUMENT_ID',
                  docType: 1,
                  doc_url:
                    'http://mp.weixin.qq.com/s?__biz=FICTIONAL&mid=123&idx=1&scene=7',
                  itemShowType: 0,
                  mpScene: 0,
                  reportId: 'FICTIONAL_REPORT_ID',
                  report_extinfo_str: '',
                  source: '虚构真实结构公众号',
                  src_type: 1,
                  thumbUrl: 'https://example.com/fictional-cover.jpg',
                  timestamp: 1786924800,
                  title: '<em class="highlight">虚构成员</em>的新文章',
                },
              ],
            },
          ],
        },
        message: null,
        recordTime: '2026-08-18T00:00:00.000Z',
      }),
    ) as typeof fetch

    await expect(
      createJustOneApiWechatProvider({ fetchImpl, token }).search('虚构成员'),
    ).resolves.toEqual([
      {
        publishedAt: '2026-08-17T00:00:00.000Z',
        sourceName: '虚构真实结构公众号',
        summary: '完全虚构的真实结构摘要',
        title: '虚构成员的新文章',
        url: 'https://mp.weixin.qq.com/s?__biz=FICTIONAL&idx=1&mid=123',
      },
    ])
  })

  it.each([
    [100, 'Token 无效'],
    [302, '调用过于频繁'],
    [303, '今日调用额度'],
    [600, '没有使用权限'],
    [601, '余额不足'],
    [602, 'Token 调用上限'],
    [500, '错误（代码 500）'],
  ] as const)('业务代码 %s 返回不泄露密钥的中文错误', async (code, message) => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        code,
        data: null,
        message: `upstream may echo ${token}`,
        recordTime: null,
      }),
    ) as typeof fetch
    const provider = createJustOneApiWechatProvider({ fetchImpl, token })

    const error = await provider.search('虚构查询').catch((reason: unknown) => reason)

    expect(error).toBeInstanceOf(Error)
    expect(String(error)).toContain(message)
    expect(String(error)).not.toContain(token)
  })

  it.each([
    [new Response('private upstream body', { status: 503 }), 'HTTP 503'],
    [new Response('{broken-json', { status: 200 }), '格式不正确'],
  ])('安全处理 HTTP 或响应格式错误', async (response, message) => {
    const fetchImpl = vi.fn(async () => response) as typeof fetch
    const provider = createJustOneApiWechatProvider({ fetchImpl, token })

    const error = await provider.search('虚构查询').catch((reason: unknown) => reason)

    expect(String(error)).toContain(message)
    expect(String(error)).not.toContain('private upstream body')
    expect(String(error)).not.toContain(token)
  })

  it('拒绝不安全的服务地址、空 Token 和空查询', async () => {
    expect(() =>
      createJustOneApiWechatProvider({
        baseUrl: 'http://api.justoneapi.com',
        token,
      }),
    ).toThrow('HTTPS')
    expect(() => createJustOneApiWechatProvider({ token: '   ' })).toThrow('Token')

    const provider = createJustOneApiWechatProvider({ token })
    await expect(provider.search('   ')).rejects.toThrow('搜索词')
  })
})
