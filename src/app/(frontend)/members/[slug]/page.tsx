import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { getPublicMemberBySlug } from '../../../../publicContent/getPublicContent'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  description: '三十二人文学志成员文学资料',
  title: '成员｜Writers Circle',
}

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const member = await getPublicMemberBySlug(slug)

  if (!member) notFound()

  return (
    <main className="public-shell">
      <nav aria-label="页面导航" className="public-nav">
        <Link href="/members">返回成员列表</Link>
        <Link href="/">Writers Circle</Link>
      </nav>
      <article className="member-profile">
        {member.profileImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt={member.profileImage.alt} className="profile-image" src={member.profileImage.url} />
        ) : null}
        <header>
          <p className="eyebrow">三十二人文学志成员</p>
          <h1>{member.name}</h1>
          {member.penName ? <p className="member-pen-name">笔名：{member.penName}</p> : null}
          {member.literaryIdentities.length ? <p>{member.literaryIdentities.join(' · ')}</p> : null}
        </header>
        {member.publicBiography ? <p className="profile-biography">{member.publicBiography}</p> : null}
        {member.region || member.organizations.length ? (
          <section aria-labelledby="literary-information">
            <h2 id="literary-information">文学资料</h2>
            {member.region ? <p>地区：{member.region}</p> : null}
            {member.organizations.length ? <p>所属机构：{member.organizations.join(' · ')}</p> : null}
          </section>
        ) : null}
        {member.disabilityCategory || member.disabilityLevel ? (
          <section aria-labelledby="disability-information">
            <h2 id="disability-information">个人资料</h2>
            {member.disabilityCategory ? <p>残疾类别：{member.disabilityCategory}</p> : null}
            {member.disabilityLevel ? <p>残疾等级：{member.disabilityLevel}</p> : null}
          </section>
        ) : null}
        {member.representativeWorks.length ? (
          <section aria-labelledby="representative-works">
            <h2 id="representative-works">代表作品</h2>
            <ul className="works-list">
              {member.representativeWorks.map((work) => (
                <li key={`${work.title}-${work.year ?? ''}`}>
                  <strong>{work.title}</strong>
                  {work.type ? ` · ${work.type}` : ''}
                  {work.year ? ` · ${work.year}` : ''}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {member.websites.length ? (
          <section aria-labelledby="public-links">
            <h2 id="public-links">公开主页</h2>
            <ul className="works-list">
              {member.websites.map((website) => (
                <li key={website.url}>
                  <a href={website.url} rel="noreferrer" target="_blank">
                    {website.label}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </article>
    </main>
  )
}
