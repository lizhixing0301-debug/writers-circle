'use client'

import { useState } from 'react'

import styles from './WechatSearchAction.module.css'

type RequestResult =
  | { kind: 'error'; message: string }
  | { kind: 'success'; message: string; runNumber: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export async function requestWechatSearchStart(
  fetchImpl: typeof fetch = fetch,
): Promise<RequestResult> {
  let response: Response

  try {
    response = await fetchImpl('/api/internal/wechat-search/run', { method: 'POST' })
  } catch {
    return { kind: 'error', message: '暂时无法连接搜索服务，请稍后再试。' }
  }

  let body: unknown

  try {
    body = await response.json()
  } catch {
    return { kind: 'error', message: '搜索任务返回内容异常，请稍后再试。' }
  }

  const message = isRecord(body) && typeof body.message === 'string' ? body.message : ''

  if (!response.ok) {
    return {
      kind: 'error',
      message: message || '搜索任务暂时无法启动，请稍后再试。',
    }
  }

  const runNumber = isRecord(body) && typeof body.runNumber === 'string' ? body.runNumber : ''

  if (!message || !runNumber) {
    return { kind: 'error', message: '搜索任务返回内容异常，请稍后再试。' }
  }

  return { kind: 'success', message, runNumber }
}

export default function WechatSearchAction() {
  const [pending, setPending] = useState(false)
  const [result, setResult] = useState<RequestResult | null>(null)

  async function startSearch() {
    setPending(true)
    setResult(null)

    try {
      setResult(await requestWechatSearchStart())
    } finally {
      setPending(false)
    }
  }

  return (
    <section className={styles.panel}>
      <div>
        <h3 className={styles.title}>全微信公众号文章搜索</h3>
        <p className={styles.description}>
          使用在册成员的姓名、笔名和搜索关键词查找最近七天的公众号文章；每次最多64个搜索词。结果只是新闻线索，仍需人工核实。
        </p>
      </div>
      <div className={styles.actions}>
        <button
          className={styles.button}
          disabled={pending}
          onClick={startSearch}
          type="button"
        >
          {pending ? '正在启动…' : '立即搜索全部成员'}
        </button>
        <a className={styles.link} href="/admin/collections/wechat-search-runs">
          查看公众号搜索记录
        </a>
      </div>
      <p
        aria-live="polite"
        className={result?.kind === 'error' ? styles.error : styles.result}
      >
        {result
          ? `${result.message}${result.kind === 'success' ? ` 搜索编号：${result.runNumber}` : ''}`
          : ''}
      </p>
    </section>
  )
}
