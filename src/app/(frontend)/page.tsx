import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="home-shell">
      <section className="home-card" aria-labelledby="page-title">
        <p className="eyebrow">三十二人文学志</p>
        <h1 id="page-title">Writers Circle</h1>
        <p className="subtitle">三十二人文学志后台</p>
        <p className="status">用于提交文学作品和管理编辑资料的内容平台。</p>
        <div className="home-actions">
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
