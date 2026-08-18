import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { getPublicWorkBySlug } from '../../../../publicContent/getPublicContent'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  description: '三十二人文学志文学作品正文',
  title: '文学作品｜Writers Circle',
}

function paragraphs(content: string) {
  return content
    .split(/\n\s*\n/u)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
}

function displayDate(value: string | undefined) {
  if (!value) return undefined
  const date = new Date(value)
  return Number.isNaN(date.valueOf()) ? undefined : date.toLocaleDateString('zh-CN')
}

export default async function WorkDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const work = await getPublicWorkBySlug(slug)

  if (!work) notFound()

  return (
    <main className="public-shell">
      <nav aria-label="页面导航" className="public-nav">
        <Link href="/works">返回作品列表</Link>
        <Link href="/">Writers Circle</Link>
      </nav>
      <article className="published-work">
        <header className="work-header">
          <p className="eyebrow">{work.category}</p>
          <h1>{work.title}</h1>
          <p className="work-byline">
            作者：
            {work.member ? (
              <Link href={`/members/${work.member.slug}`}>{work.authorName}</Link>
            ) : (
              work.authorName
            )}
          </p>
          {displayDate(work.publishedAt) ? (
            <time dateTime={work.publishedAt}>{displayDate(work.publishedAt)}</time>
          ) : null}
        </header>
        <div className="work-content">
          {paragraphs(work.content).map((paragraph, index) => (
            <p key={`${index}-${paragraph.slice(0, 24)}`}>{paragraph}</p>
          ))}
        </div>
      </article>
    </main>
  )
}
