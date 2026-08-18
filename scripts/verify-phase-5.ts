import { randomUUID } from 'node:crypto'

import config from '@payload-config'
import { getPayload, type Payload } from 'payload'

import { createPublicContentStore } from '../src/publicContent/publicContent'

const baseUrl = process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3000'
const runId = randomUUID().slice(0, 8)
const publicSlug = `phase-5-public-${runId}`
const createdMemberIds: Array<number | string> = []
const createdNewsIds: Array<number | string> = []

function requireCondition(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

async function requireHttpStatus(pathname: string, status: number) {
  const response = await fetch(`${baseUrl}${pathname}`)
  requireCondition(
    response.status === status,
    `${pathname} 返回 HTTP ${response.status}，预期为 ${status}。`,
  )
}

async function cleanup(payload: Payload) {
  for (const id of createdNewsIds) {
    await payload.delete({ collection: 'news-candidates', id, overrideAccess: true })
  }

  for (const id of createdMemberIds) {
    await payload.delete({ collection: 'members', id, overrideAccess: true })
  }

  console.log('PASS：Phase 5 的全部虚构成员和虚构动态均已清理。')
}

async function main() {
  const payload = await getPayload({ config })

  try {
    const member = await payload.create({
      collection: 'members',
      data: {
        consentNotes: '仅用于 Phase 5 虚构验收，不得公开。',
        consentStatus: 'granted',
        disabilityCategory: 'physical',
        disabilityLevel: 'level2',
        displayOrder: 9999,
        internalNotes: 'Phase 5 虚构内部备注，不得公开。',
        literaryIdentities: [{ value: '虚构诗人' }],
        name: `Phase 5 虚构成员 ${runId}`,
        publicBiography: '这是一段仅用于运行验收的虚构公开简介。',
        publicProfileEnabled: true,
        representativeWorks: [{ title: 'Phase 5 虚构作品', type: '诗集', year: 2026 }],
        showDisabilityCategory: true,
        showDisabilityLevel: false,
        slug: publicSlug,
        status: 'active',
      },
      overrideAccess: true,
    })
    createdMemberIds.push(member.id)

    const createdPublicNews = await payload.create({
      collection: 'news-candidates',
      data: {
        category: 'creation',
        publishedAt: '2026-08-18T00:00:00.000Z',
        relatedMember: member.id,
        sourceName: 'Phase 5 虚构公众号',
        sourceUrl: `https://example.com/phase-5-${runId}`,
        summary: '这是一段仅用于运行验收的虚构公开动态摘要。',
        title: `Phase 5 允许公开的虚构动态 ${runId}`,
        verificationNotes: 'Phase 5 虚构核实记录，不得公开。',
      } as never,
      overrideAccess: true,
    })
    createdNewsIds.push(createdPublicNews.id)
    const publicNews = await payload.update({
      collection: 'news-candidates',
      data: { publiclyVisible: true, status: 'confirmed' },
      id: createdPublicNews.id,
      overrideAccess: true,
    })

    const createdHiddenNews = await payload.create({
      collection: 'news-candidates',
      data: {
        category: 'award',
        publiclyVisible: false,
        title: `Phase 5 不允许公开的虚构动态 ${runId}`,
      } as never,
      overrideAccess: true,
    })
    createdNewsIds.push(createdHiddenNews.id)
    const hiddenNews = await payload.update({
      collection: 'news-candidates',
      data: { status: 'confirmed' },
      id: createdHiddenNews.id,
      overrideAccess: true,
    })

    const store = createPublicContentStore(payload)
    const publicMembers = await store.getPublicMembers()
    const publicMember = await store.getPublicMemberBySlug(publicSlug)
    const publicNewsItems = await store.getPublicNews()
    const publicText = JSON.stringify({ publicMember, publicMembers, publicNewsItems })

    requireCondition(
      publicMembers.some((item) => item.slug === publicSlug),
      '已授权的虚构成员没有出现在公开成员列表。',
    )
    requireCondition(publicMember?.disabilityCategory === '肢体', '已获单独同意的残疾类别没有公开。')
    requireCondition(!publicMember?.disabilityLevel, '未获同意的残疾等级被公开。')
    requireCondition(!publicText.includes('内部备注'), '内部备注泄露到了公开数据。')
    requireCondition(!publicText.includes('仅用于 Phase 5 虚构验收'), '授权备注泄露到了公开数据。')
    console.log('PASS：成员授权条件和残疾信息独立公开开关均生效，内部资料未泄露。')

    requireCondition(
      publicNewsItems.some((item) => item.title === publicNews.title),
      '已确认且允许公开的动态没有出现在公开数据。',
    )
    requireCondition(
      !publicNewsItems.some((item) => item.title === hiddenNews.title),
      '未开启公开的动态被错误展示。',
    )
    requireCondition(!publicText.includes('虚构核实记录'), '新闻核实记录泄露到了公开数据。')
    requireCondition(!publicText.includes('candidateNumber'), '新闻候选编号泄露到了公开数据。')
    console.log('PASS：公开动态必须同时满足“已确认”和“允许公开”，内部字段未泄露。')

    await requireHttpStatus('/', 200)
    await requireHttpStatus('/members', 200)
    await requireHttpStatus(`/members/${publicSlug}`, 200)
    await requireHttpStatus('/members/not-public-member', 404)
    await requireHttpStatus('/news', 200)
    console.log('PASS：首页、成员列表、成员详情、未公开成员 404 和动态页均符合预期。')
  } finally {
    await cleanup(payload)
  }
}

await main()
