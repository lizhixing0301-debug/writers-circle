import { describe, expect, it } from 'vitest'

import { createPublicContentStore } from './publicContent'

const publicMember = {
  consentStatus: 'granted',
  disabilityCategory: 'physical',
  disabilityLevel: 'level2',
  displayOrder: 2,
  id: 1,
  internalNotes: '绝不能公开的内部备注',
  literaryIdentities: [{ value: '诗人' }],
  name: '虚构作家',
  organizations: [{ value: '虚构文学社' }],
  penName: '春风',
  profileImage: { alt: '虚构头像替代文字', url: '/media/fictional.jpg' },
  publicBiography: '这是一段已经同意公开的虚构简介。',
  publicProfileEnabled: true,
  region: '虚构地区',
  representativeWorks: [{ title: '虚构作品', type: '诗集', year: 2026 }],
  showDisabilityCategory: true,
  showDisabilityLevel: false,
  slug: 'fictional-writer',
  status: 'active',
  websites: [{ label: '虚构主页', url: 'https://example.com/fictional' }],
}

function fakePayload() {
  return {
    find: async ({ collection, where }: { collection: string; where?: unknown }) => {
      if (collection === 'members') {
        const slug = JSON.stringify(where).includes('fictional-writer')
        return { docs: slug ? [publicMember] : [publicMember], totalDocs: 1 }
      }

      if (collection === 'published-works') {
        return {
          docs: [
            {
              authorName: '公开笔名',
              authorizationNotes: '仅后台可见的授权说明',
              category: 'poetry',
              content: '第一段虚构正文。\n\n第二段虚构正文。',
              excerpt: '虚构作品导语。',
              id: 21,
              publicationAuthorized: true,
              publishedAt: '2026-08-18T00:00:00.000Z',
              relatedMember: publicMember,
              slug: 'fictional-work',
              sourceSubmission: {
                contact: '绝不能公开的联系方式',
                submissionNumber: 'SUB-PRIVATE',
              },
              status: 'published',
              title: '允许公开的虚构作品',
            },
            {
              authorName: '隐藏作者',
              category: 'prose',
              content: '这篇虚构作品不允许公开。',
              id: 22,
              publicationAuthorized: false,
              slug: 'hidden-work',
              status: 'draft',
              title: '不应公开的虚构作品',
            },
          ],
          totalDocs: 2,
        }
      }

      return {
        docs: [
          {
            category: 'creation',
            candidateNumber: 'NEWS-PRIVATE',
            discoveredAt: '2026-08-18T00:00:00.000Z',
            id: 11,
            publiclyVisible: true,
            publishedAt: '2026-08-17T00:00:00.000Z',
            relatedMember: publicMember,
            sourceName: '虚构公众号',
            sourceReference: 'internal-reference',
            sourceUrl: 'https://example.com/source',
            status: 'confirmed',
            summary: '虚构公开摘要。',
            title: '虚构文学动态',
            verificationNotes: '仅内部核实',
          },
          {
            category: 'award',
            id: 12,
            publiclyVisible: false,
            status: 'confirmed',
            title: '不应公开的动态',
          },
        ],
        totalDocs: 2,
      }
    },
  }
}

describe('安全公开数据层', () => {
  it('只映射获授权成员的公开字段', async () => {
    const store = createPublicContentStore(fakePayload() as never)

    const members = await store.getPublicMembers()

    expect(members).toEqual([
      expect.objectContaining({
        name: '虚构作家',
        publicBiography: '这是一段已经同意公开的虚构简介。',
        slug: 'fictional-writer',
      }),
    ])
    expect(JSON.stringify(members)).not.toContain('internalNotes')
    expect(JSON.stringify(members)).not.toContain('consentNotes')
    expect(JSON.stringify(members)).not.toContain('searchKeywords')
  })

  it('只在对应的残疾公开开关开启时返回该字段', async () => {
    const store = createPublicContentStore(fakePayload() as never)

    const member = await store.getPublicMemberBySlug('fictional-writer')

    expect(member).toMatchObject({ disabilityCategory: '肢体' })
    expect(member?.disabilityLevel).toBeUndefined()
  })

  it('只返回已确认且主动允许公开的新闻，并排除内部字段', async () => {
    const store = createPublicContentStore(fakePayload() as never)

    const news = await store.getPublicNews()

    expect(news).toEqual([expect.objectContaining({ title: '虚构文学动态' })])
    expect(JSON.stringify(news)).not.toContain('不应公开的动态')
    expect(JSON.stringify(news)).not.toContain('candidateNumber')
    expect(JSON.stringify(news)).not.toContain('verificationNotes')
    expect(JSON.stringify(news)).not.toContain('sourceReference')
  })

  it('只返回已发布且已获授权的作品', async () => {
    const store = createPublicContentStore(fakePayload() as never)

    const works = await store.getPublicWorks()

    expect(works.map((work) => work.title)).toEqual(['允许公开的虚构作品'])
    expect(works[0]).toMatchObject({
      authorName: '公开笔名',
      category: '诗歌',
      member: { name: '虚构作家', slug: 'fictional-writer' },
      slug: 'fictional-work',
    })
  })

  it('公开作品不包含投稿、联系方式和授权后台字段', async () => {
    const store = createPublicContentStore(fakePayload() as never)

    const work = await store.getPublicWorkBySlug('fictional-work')
    const text = JSON.stringify(work)

    expect(text).not.toContain('sourceSubmission')
    expect(text).not.toContain('authorizationNotes')
    expect(text).not.toContain('绝不能公开的联系方式')
    expect(text).not.toContain('submissionNumber')
  })
})
