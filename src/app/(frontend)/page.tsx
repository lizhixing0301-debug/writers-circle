import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="home-shell">
      <section className="home-card" aria-labelledby="page-title">
        <p className="eyebrow">Phase 0 · 项目基础</p>
        <h1 id="page-title">Writers Circle</h1>
        <p className="subtitle">三十二人文学志后台</p>
        <p className="status">Next.js、Payload CMS 与 PostgreSQL 的基础骨架。</p>
        <Link className="admin-link" href="/admin">
          打开管理后台
        </Link>
      </section>
    </main>
  )
}

