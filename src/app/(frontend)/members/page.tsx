import Link from 'next/link'
import type { Metadata } from 'next'

import { getPublicMembers } from '../../../publicContent/getPublicContent'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  description: '三十二人文学志成员展示',
  title: '成员｜Writers Circle',
}

export default async function MembersPage() {
  const members = await getPublicMembers()

  return (
    <main className="public-shell">
      <nav aria-label="页面导航" className="public-nav">
        <Link href="/">Writers Circle</Link>
        <Link href="/news">文学动态</Link>
      </nav>
      <header className="public-header">
        <p className="eyebrow">三十二人文学志</p>
        <h1>成员</h1>
        <p>这里展示已取得本人同意的成员文学资料。</p>
      </header>
      {members.length ? (
        <ul className="member-grid">
          {members.map((member) => (
            <li className="member-card" key={member.slug}>
              {member.profileImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt={member.profileImage.alt} src={member.profileImage.url} />
              ) : null}
              <h2>
                <Link href={`/members/${member.slug}`}>{member.name}</Link>
              </h2>
              {member.penName ? <p className="member-pen-name">笔名：{member.penName}</p> : null}
              {member.literaryIdentities.length ? (
                <p>{member.literaryIdentities.join(' · ')}</p>
              ) : null}
              {member.region ? <p>{member.region}</p> : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="empty-state">成员资料正在整理中。</p>
      )}
    </main>
  )
}
