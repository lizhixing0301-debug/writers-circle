import type { Payload } from 'payload'

import type { Media, Member, NewsCandidate, PublishedWork } from '../payload-types'

export type PublicMember = {
  disabilityCategory?: string
  disabilityLevel?: string
  displayOrder: number
  literaryIdentities: string[]
  name: string
  organizations: string[]
  penName?: string
  profileImage?: { alt: string; url: string }
  publicBiography?: string
  region?: string
  representativeWorks: Array<{ title: string; type?: string; year?: number }>
  slug: string
  websites: Array<{ label: string; url: string }>
}

export type PublicNewsItem = {
  category: string
  member?: Pick<PublicMember, 'name' | 'penName' | 'slug'>
  publishedAt?: string
  sourceName?: string
  sourceUrl?: string
  summary?: string
  title: string
}

export type PublicWork = {
  authorName: string
  category: string
  content: string
  excerpt?: string
  member?: Pick<PublicMember, 'name' | 'penName' | 'slug'>
  publishedAt?: string
  slug: string
  title: string
}

type PublicMemberSource = Partial<Member> & { name: string; slug: string }

const disabilityCategories: Record<string, string> = {
  hearing: '听力',
  intellectual: '智力',
  mental: '精神',
  multiple: '多重',
  other: '其他',
  physical: '肢体',
  speech: '言语',
  visual: '视力',
}

const disabilityLevels: Record<string, string> = {
  level1: '一级',
  level2: '二级',
  level3: '三级',
  level4: '四级',
}

const newsCategories: Record<string, string> = {
  activity: '活动动态',
  award: '获奖荣誉',
  creation: '创作动态',
  media: '媒体报道',
  other: '其他',
  personal: '个人动态',
}

const workCategories: Record<string, string> = {
  criticism: '评论',
  fiction: '小说',
  other: '其他',
  poetry: '诗歌',
  prose: '散文',
}

function textValues(values: Array<{ value?: null | string }> | null | undefined) {
  return (values ?? []).flatMap(({ value }) =>
    typeof value === 'string' && value.trim() ? [value.trim()] : [],
  )
}

function safeHttpUrl(value: string | null | undefined) {
  if (!value) return undefined

  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : undefined
  } catch {
    return undefined
  }
}

function publicImage(value: Partial<Member>['profileImage']) {
  if (!value || typeof value !== 'object') return undefined

  const image = value as Media
  if (!image.alt || !image.url) return undefined

  return { alt: image.alt, url: image.url }
}

function publicWebsites(value: Partial<Member>['websites']) {
  return (value ?? []).flatMap(({ label, url }) => {
    const safeUrl = safeHttpUrl(url)
    return label && safeUrl ? [{ label, url: safeUrl }] : []
  })
}

function publicWorks(value: Partial<Member>['representativeWorks']) {
  return (value ?? []).flatMap(({ title, type, year }) => {
    if (!title) return []
    return [{ ...(type ? { type } : {}), ...(year ? { year } : {}), title }]
  })
}

function isPublicMember(
  member: Partial<Member> | null | undefined,
): member is PublicMemberSource {
  return Boolean(
    member &&
      member.status === 'active' &&
      member.consentStatus === 'granted' &&
      member.publicProfileEnabled &&
      member.slug &&
      member.name,
  )
}

export function toPublicMember(
  member: Partial<Member> | null | undefined,
): PublicMember | undefined {
  if (!isPublicMember(member)) return undefined

  const category =
    member.showDisabilityCategory && member.disabilityCategory
      ? disabilityCategories[member.disabilityCategory]
      : undefined
  const level =
    member.showDisabilityLevel && member.disabilityLevel
      ? disabilityLevels[member.disabilityLevel]
      : undefined

  return {
    ...(category ? { disabilityCategory: category } : {}),
    ...(level ? { disabilityLevel: level } : {}),
    displayOrder: member.displayOrder ?? 0,
    literaryIdentities: textValues(member.literaryIdentities),
    name: member.name,
    organizations: textValues(member.organizations),
    ...(member.penName ? { penName: member.penName } : {}),
    ...(publicImage(member.profileImage) ? { profileImage: publicImage(member.profileImage) } : {}),
    ...(member.publicBiography ? { publicBiography: member.publicBiography } : {}),
    ...(member.region ? { region: member.region } : {}),
    representativeWorks: publicWorks(member.representativeWorks),
    slug: member.slug,
    websites: publicWebsites(member.websites),
  }
}

function publicRelatedMember(value: Partial<NewsCandidate>['relatedMember']) {
  if (!value || typeof value !== 'object') return undefined

  const member = toPublicMember(value as Partial<Member>)
  if (!member) return undefined

  return { name: member.name, ...(member.penName ? { penName: member.penName } : {}), slug: member.slug }
}

function publicWorkMember(value: Partial<PublishedWork>['relatedMember']) {
  if (!value || typeof value !== 'object') return undefined

  const member = toPublicMember(value as Partial<Member>)
  if (!member) return undefined

  return {
    name: member.name,
    ...(member.penName ? { penName: member.penName } : {}),
    slug: member.slug,
  }
}

export function toPublicWork(
  work: Partial<PublishedWork> | null | undefined,
): PublicWork | undefined {
  if (
    !work ||
    work.status !== 'published' ||
    !work.publicationAuthorized ||
    !work.title ||
    !work.slug ||
    !work.authorName ||
    !work.category ||
    !work.content
  ) {
    return undefined
  }

  return {
    authorName: work.authorName,
    category: workCategories[work.category] ?? '其他',
    content: work.content,
    ...(work.excerpt ? { excerpt: work.excerpt } : {}),
    ...(publicWorkMember(work.relatedMember)
      ? { member: publicWorkMember(work.relatedMember) }
      : {}),
    ...(work.publishedAt ? { publishedAt: work.publishedAt } : {}),
    slug: work.slug,
    title: work.title,
  }
}

export function toPublicNewsItem(
  candidate: Partial<NewsCandidate> | null | undefined,
): PublicNewsItem | undefined {
  if (
    !candidate ||
    candidate.status !== 'confirmed' ||
    !candidate.publiclyVisible ||
    !candidate.title ||
    !candidate.category
  ) {
    return undefined
  }

  return {
    category: newsCategories[candidate.category] ?? '其他',
    ...(publicRelatedMember(candidate.relatedMember)
      ? { member: publicRelatedMember(candidate.relatedMember) }
      : {}),
    ...(candidate.publishedAt ? { publishedAt: candidate.publishedAt } : {}),
    ...(candidate.sourceName ? { sourceName: candidate.sourceName } : {}),
    ...(safeHttpUrl(candidate.sourceUrl) ? { sourceUrl: safeHttpUrl(candidate.sourceUrl) } : {}),
    ...(candidate.summary ? { summary: candidate.summary } : {}),
    title: candidate.title,
  }
}

export function createPublicContentStore(payload: Payload) {
  return {
    async getPublicWorks(): Promise<PublicWork[]> {
      const result = await payload.find({
        collection: 'published-works',
        depth: 1,
        limit: 100,
        overrideAccess: true,
        pagination: false,
        select: {
          authorName: true,
          category: true,
          content: true,
          excerpt: true,
          publicationAuthorized: true,
          publishedAt: true,
          relatedMember: true,
          slug: true,
          status: true,
          title: true,
        },
        sort: '-publishedAt',
        where: {
          and: [
            { status: { equals: 'published' } },
            { publicationAuthorized: { equals: true } },
          ],
        },
      })

      return result.docs.flatMap((work) => {
        const publicWork = toPublicWork(work)
        return publicWork ? [publicWork] : []
      })
    },

    async getPublicWorkBySlug(slug: string): Promise<PublicWork | undefined> {
      const result = await payload.find({
        collection: 'published-works',
        depth: 1,
        limit: 1,
        overrideAccess: true,
        pagination: false,
        select: {
          authorName: true,
          category: true,
          content: true,
          excerpt: true,
          publicationAuthorized: true,
          publishedAt: true,
          relatedMember: true,
          slug: true,
          status: true,
          title: true,
        },
        where: {
          and: [
            { slug: { equals: slug } },
            { status: { equals: 'published' } },
            { publicationAuthorized: { equals: true } },
          ],
        },
      })

      return toPublicWork(result.docs[0])
    },

    async getPublicMembers(): Promise<PublicMember[]> {
      const result = await payload.find({
        collection: 'members',
        depth: 1,
        limit: 100,
        overrideAccess: true,
        pagination: false,
        select: {
          consentStatus: true,
          disabilityCategory: true,
          disabilityLevel: true,
          displayOrder: true,
          literaryIdentities: true,
          name: true,
          organizations: true,
          penName: true,
          profileImage: true,
          publicBiography: true,
          publicProfileEnabled: true,
          region: true,
          representativeWorks: true,
          showDisabilityCategory: true,
          showDisabilityLevel: true,
          slug: true,
          status: true,
          websites: true,
        },
        sort: 'displayOrder',
        where: {
          and: [
            { status: { equals: 'active' } },
            { consentStatus: { equals: 'granted' } },
            { publicProfileEnabled: { equals: true } },
          ],
        },
      })

      return result.docs.flatMap((member) => {
        const publicMember = toPublicMember(member)
        return publicMember ? [publicMember] : []
      })
    },

    async getPublicMemberBySlug(slug: string): Promise<PublicMember | undefined> {
      const result = await payload.find({
        collection: 'members',
        depth: 1,
        limit: 1,
        overrideAccess: true,
        pagination: false,
        select: {
          consentStatus: true,
          disabilityCategory: true,
          disabilityLevel: true,
          displayOrder: true,
          literaryIdentities: true,
          name: true,
          organizations: true,
          penName: true,
          profileImage: true,
          publicBiography: true,
          publicProfileEnabled: true,
          region: true,
          representativeWorks: true,
          showDisabilityCategory: true,
          showDisabilityLevel: true,
          slug: true,
          status: true,
          websites: true,
        },
        where: {
          and: [
            { slug: { equals: slug } },
            { status: { equals: 'active' } },
            { consentStatus: { equals: 'granted' } },
            { publicProfileEnabled: { equals: true } },
          ],
        },
      })

      return toPublicMember(result.docs[0])
    },

    async getPublicNews(): Promise<PublicNewsItem[]> {
      const result = await payload.find({
        collection: 'news-candidates',
        depth: 1,
        limit: 100,
        overrideAccess: true,
        pagination: false,
        select: {
          category: true,
          publiclyVisible: true,
          publishedAt: true,
          relatedMember: true,
          sourceName: true,
          sourceUrl: true,
          status: true,
          summary: true,
          title: true,
        },
        sort: '-publishedAt',
        where: {
          and: [
            { status: { equals: 'confirmed' } },
            { publiclyVisible: { equals: true } },
          ],
        },
      })

      return result.docs.flatMap((candidate) => {
        const item = toPublicNewsItem(candidate)
        return item ? [item] : []
      })
    },
  }
}
