import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="home-shell">
      <section className="home-card" aria-labelledby="page-title">
        <p className="eyebrow">三十二人文学志</p>
        <h1 id="page-title">Writers Circle</h1>
        <p className="subtitle">三十二人文学志</p>
        <p className="status">
          记录成员的文学创作与已经人工核实的文学动态。
        </p>
        <div className="home-actions">
          <Link className="submission-link" href="/members">
            浏览成员
          </Link>
          <Link className="admin-link" href="/news">
            文学动态
          </Link>
          <Link className="submission-link" href="/submit">
            我要投稿
          </Link>
          <Link className="admin-link" href="/admin">
            打开管理后台
          </Link>
        </div>
      </section>
    </main>
  )
}
