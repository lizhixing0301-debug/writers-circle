import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import WechatSearchAction, { requestWechatSearchStart } from './WechatSearchAction'

describe('公众号搜索后台操作区', () => {
  it('用通俗中文说明搜索范围、费用边界和人工核实要求', () => {
    const markup = renderToStaticMarkup(<WechatSearchAction />)

    expect(markup).toContain('全微信公众号文章搜索')
    expect(markup).toContain('最近七天')
    expect(markup).toContain('最多64个搜索词')
    expect(markup).toContain('仍需人工核实')
    expect(markup).toContain('立即搜索全部成员')
    expect(markup).toContain('公众号搜索记录')
    expect(markup).toContain('aria-live="polite"')
  })

  it('成功启动时只返回安全提示和搜索编号', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          message: '搜索任务已经开始，请稍后查看“公众号搜索记录”。',
          runNumber: 'WXSEARCH-20260818-ABCDEF12',
        }),
        { headers: { 'content-type': 'application/json' }, status: 202 },
      ),
    ) as typeof fetch

    await expect(requestWechatSearchStart(fetchImpl)).resolves.toEqual({
      kind: 'success',
      message: '搜索任务已经开始，请稍后查看“公众号搜索记录”。',
      runNumber: 'WXSEARCH-20260818-ABCDEF12',
    })
    expect(fetchImpl).toHaveBeenCalledWith('/api/internal/wechat-search/run', {
      method: 'POST',
    })
  })

  it('接口失败或响应损坏时显示通用提示，不回显私密内容', async () => {
    const failedFetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          message: '搜索任务暂时无法启动，请稍后再试。',
          privateDetail: 'fictional-token',
        }),
        { headers: { 'content-type': 'application/json' }, status: 500 },
      ),
    ) as typeof fetch

    await expect(requestWechatSearchStart(failedFetch)).resolves.toEqual({
      kind: 'error',
      message: '搜索任务暂时无法启动，请稍后再试。',
    })

    const brokenFetch = vi.fn(async () => new Response('{broken', { status: 200 })) as typeof fetch
    await expect(requestWechatSearchStart(brokenFetch)).resolves.toEqual({
      kind: 'error',
      message: '搜索任务返回内容异常，请稍后再试。',
    })
  })

  it('网络异常时不把底层错误显示给管理员', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('private network detail fictional-token')
    }) as typeof fetch

    await expect(requestWechatSearchStart(fetchImpl)).resolves.toEqual({
      kind: 'error',
      message: '暂时无法连接搜索服务，请稍后再试。',
    })
  })
})
