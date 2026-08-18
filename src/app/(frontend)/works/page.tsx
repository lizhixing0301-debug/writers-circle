import type { Metadata } from 'next'
import Link from 'next/link'

import { getPublicWorks } from '../../../publicContent/getPublicContent'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  description: '三十二人文学志公开文学作品',
  title: '文学作品｜Writers Circle',
}

function displayDate(value: string | undefined) {
  if (!value) return undefined
  const date = new Date(value)
  return Number.isNaN(date.valueOf()) ? undefined : date.toLocaleDateString('zh-CN')
}

export default async function WorksPage() {
  const works = await getPublicWorks()

  return (
    <main className="public-shell">
      <nav aria-label="页面导航" className="public-nav">
        <Link href="/">Writers Circle</Link>
        <Link href="/members">成员</Link>
        <Link href="/news">文学动态</Link>
      </nav>
      <header className="public-header">
        <p className="eyebrow">三十二人文学志</p>
        <h1>文学作品</h1>
        <p>这里收录已经人工审核并确认获得公开授权的文学作品。</p>
      </header>
      {works.length ? (
        <ol className="works-grid">
          {works.map((work) => (
            <li className="work-card" key={work.slug}>
              <p className="news-meta">
                <span>{work.category}</span>
                {displayDate(work.publishedAt) ? (
                  <time dateTime={work.publishedAt}>{displayDate(work.publishedAt)}</time>
                ) : null}
              </p>
              <h2>
                <Link href={`/works/${work.slug}`}>{work.title}</Link>
              </h2>
              <p className="work-author">作者：{work.authorName}</p>
              {work.excerpt ? <p className="work-excerpt">{work.excerpt}</p> : null}
              <Link className="source-link" href={`/works/${work.slug}`}>
                阅读作品
              </Link>
            </li>
          ))}
        </ol>
      ) : (
        <p className="empty-state">公开作品正在整理中。</p>
      )}
    </main>
  )
}
