import Link from 'next/link'
import type { Metadata } from 'next'

import { getPublicNews } from '../../../publicContent/getPublicContent'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  description: '三十二人文学志已确认文学动态',
  title: '文学动态｜Writers Circle',
}

function displayDate(value: string | undefined) {
  if (!value) return undefined

  const date = new Date(value)
  return Number.isNaN(date.valueOf()) ? undefined : date.toLocaleDateString('zh-CN')
}

export default async function NewsPage() {
  const news = await getPublicNews()

  return (
    <main className="public-shell">
      <nav aria-label="页面导航" className="public-nav">
        <Link href="/">Writers Circle</Link>
        <Link href="/members">成员</Link>
      </nav>
      <header className="public-header">
        <p className="eyebrow">三十二人文学志</p>
        <h1>文学动态</h1>
        <p>这里仅展示已经人工核实并获准公开的动态。</p>
      </header>
      {news.length ? (
        <ol className="news-list">
          {news.map((item) => (
            <li className="news-card" key={`${item.title}-${item.sourceUrl ?? item.publishedAt ?? ''}`}>
              <p className="news-meta">
                <span>{item.category}</span>
                {displayDate(item.publishedAt) ? (
                  <time dateTime={item.publishedAt}>{displayDate(item.publishedAt)}</time>
                ) : null}
              </p>
              <h2>{item.title}</h2>
              {item.member ? (
                <p>
                  相关成员：<Link href={`/members/${item.member.slug}`}>{item.member.name}</Link>
                </p>
              ) : null}
              {item.summary ? <p className="news-summary">{item.summary}</p> : null}
              {item.sourceName ? <p>来源：{item.sourceName}</p> : null}
              {item.sourceUrl ? (
                <a className="source-link" href={item.sourceUrl} rel="noreferrer" target="_blank">
                  查看原文
                </a>
              ) : null}
            </li>
          ))}
        </ol>
      ) : (
        <p className="empty-state">公开动态正在整理中。</p>
      )}
    </main>
  )
}
