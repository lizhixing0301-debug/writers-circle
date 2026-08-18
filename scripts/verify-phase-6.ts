import { randomUUID } from 'node:crypto'

import config from '@payload-config'
import { getPayload, type Payload } from 'payload'

import { createPublicContentStore } from '../src/publicContent/publicContent'

const baseUrl = process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3000'
const runId = randomUUID().slice(0, 8)
const publicSlug = `phase-6-public-work-${runId}`
const hiddenSlug = `phase-6-hidden-work-${runId}`
const createdWorkIds: Array<number | string> = []

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
  for (const id of createdWorkIds) {
    await payload.delete({ collection: 'published-works', id, overrideAccess: true })
  }

  const remaining = await payload.find({
    collection: 'published-works',
    limit: 10,
    overrideAccess: true,
    where: { slug: { in: [publicSlug, hiddenSlug] } },
  })
  requireCondition(remaining.totalDocs === 0, 'Phase 6 虚构作品没有清理干净。')
  console.log('PASS：Phase 6 的全部虚构作品均已清理。')
}

async function main() {
  const payload = await getPayload({ config })

  try {
    const publicWork = await payload.create({
      collection: 'published-works',
      data: {
        authorName: 'Phase 6 虚构笔名',
        authorizationNotes: '仅用于 Phase 6 虚构验收，不得公开。',
        category: 'poetry',
        content: '这是第一段完全虚构的作品正文。\n\n这是第二段完全虚构的作品正文。',
        excerpt: '这是一段完全虚构的作品导语。',
        publicationAuthorized: true,
        slug: publicSlug,
        status: 'published',
        title: `Phase 6 允许公开的虚构作品 ${runId}`,
      },
      overrideAccess: true,
    })
    createdWorkIds.push(publicWork.id)

    const hiddenWork = await payload.create({
      collection: 'published-works',
      data: {
        authorName: 'Phase 6 隐藏笔名',
        category: 'prose',
        content: '这是一篇未获公开授权、只用于验收的虚构作品正文。',
        publicationAuthorized: false,
        slug: hiddenSlug,
        status: 'published',
        title: `Phase 6 不允许公开的虚构作品 ${runId}`,
      },
      overrideAccess: true,
    })
    createdWorkIds.push(hiddenWork.id)

    requireCondition(publicWork.status === 'published', '已授权虚构作品没有进入已发布状态。')
    requireCondition(publicWork.publishedAt, '已授权虚构作品没有服务器发布时间。')
    requireCondition(hiddenWork.status === 'draft', '未授权虚构作品没有被自动退回草稿。')
    console.log('PASS：授权发布和未授权自动退回草稿均生效。')

    const store = createPublicContentStore(payload)
    const works = await store.getPublicWorks()
    const detail = await store.getPublicWorkBySlug(publicSlug)
    const hiddenDetail = await store.getPublicWorkBySlug(hiddenSlug)
    const publicText = JSON.stringify({ detail, works })

    requireCondition(
      works.some((work) => work.slug === publicSlug),
      '已授权且已发布的虚构作品没有进入公开列表。',
    )
    requireCondition(!hiddenDetail, '未授权虚构作品进入了公开详情。')
    requireCondition(detail?.authorName === 'Phase 6 虚构笔名', '公开署名不正确。')
    requireCondition(!publicText.includes('authorizationNotes'), '授权后台字段泄露。')
    requireCondition(!publicText.includes('sourceSubmission'), '投稿关联字段泄露。')
    requireCondition(!publicText.includes('不得公开'), '授权说明内容泄露。')
    console.log('PASS：公开作品双条件和后台字段隔离均生效。')

    await requireHttpStatus('/works', 200)
    await requireHttpStatus(`/works/${publicSlug}`, 200)
    await requireHttpStatus(`/works/${hiddenSlug}`, 404)
    await requireHttpStatus('/api/published-works?limit=1', 403)
    console.log('PASS：作品列表、公开详情、隐藏作品 404 和未登录后台权限均符合预期。')
  } finally {
    await cleanup(payload)
  }
}

await main()
